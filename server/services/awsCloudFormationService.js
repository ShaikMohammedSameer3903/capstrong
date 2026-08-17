// ============================================================
// AWS CloudFormation Service
// Provision, manage, monitor, and delete AWS stacks using AWS SDK v3
// ============================================================

const {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  DescribeStackEventsCommand,
  DescribeStackResourcesCommand,
  ValidateTemplateCommand,
} = require('@aws-sdk/client-cloudformation');
const fs = require('fs');
const path = require('path');

class AwsCloudFormationService {
  /**
   * Helper to load template YAML content
   */
  static getTemplateContent(templateName) {
    const templatePath = path.join(__dirname, '..', 'infrastructure', 'cloudformation', `${templateName}.yaml`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`CloudFormation template '${templateName}.yaml' not found at ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * Validate CloudFormation template content
   */
  static async validateTemplate(clientConfig, templateBody) {
    const client = new CloudFormationClient(clientConfig);
    try {
      const response = await client.send(new ValidateTemplateCommand({ TemplateBody: templateBody }));
      return { valid: true, parameters: response.Parameters, description: response.Description };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Deploy or update a CloudFormation stack
   */
  static async deployStack(clientConfig, stackName, templateBody, parameters = {}, tags = {}, onLog = null) {
    const client = new CloudFormationClient(clientConfig);

    const formattedParams = Object.keys(parameters).map(key => ({
      ParameterKey: key,
      ParameterValue: String(parameters[key]),
    }));

    const formattedTags = Object.keys(tags).map(key => ({
      Key: key,
      Value: String(tags[key]),
    }));

    // Check if stack exists
    let stackExists = false;
    try {
      const desc = await client.send(new DescribeStacksCommand({ StackName: stackName }));
      if (desc.Stacks && desc.Stacks.length > 0 && desc.Stacks[0].StackStatus !== 'DELETE_COMPLETE') {
        stackExists = true;
      }
    } catch (e) {
      stackExists = false;
    }

    if (onLog) {
      await onLog('CLOUDFORMATION', `${stackExists ? 'Updating' : 'Creating'} CloudFormation stack '${stackName}'...`);
    }

    try {
      if (stackExists) {
        await client.send(new UpdateStackCommand({
          StackName: stackName,
          TemplateBody: templateBody,
          Parameters: formattedParams,
          Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM'],
          Tags: formattedTags,
        }));
      } else {
        await client.send(new CreateStackCommand({
          StackName: stackName,
          TemplateBody: templateBody,
          Parameters: formattedParams,
          Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM'],
          Tags: formattedTags,
          OnFailure: 'ROLLBACK',
        }));
      }
    } catch (err) {
      if (err.message && err.message.includes('No updates are to be performed')) {
        if (onLog) await onLog('CLOUDFORMATION', `CloudFormation stack '${stackName}' is already up to date.`);
      } else {
        throw err;
      }
    }

    // Wait for stack creation/update completion
    const result = await this.waitForStackCompletion(client, stackName, onLog);
    return result;
  }

  /**
   * Poll stack status until completion or failure
   */
  static async waitForStackCompletion(client, stackName, onLog = null) {
    const startTime = Date.now();
    const timeoutMs = 15 * 60 * 1000; // 15 minutes max
    let lastSeenEventId = null;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const desc = await client.send(new DescribeStacksCommand({ StackName: stackName }));
        const stack = desc.Stacks?.[0];

        if (!stack) {
          throw new Error(`CloudFormation stack '${stackName}' not found.`);
        }

        const status = stack.StackStatus;

        // Poll events for streaming logs
        try {
          const eventsRes = await client.send(new DescribeStackEventsCommand({ StackName: stackName }));
          const events = (eventsRes.StackEvents || []).reverse();
          for (const ev of events) {
            if (onLog && ev.EventId !== lastSeenEventId) {
              const msg = `[CloudFormation] ${ev.LogicalResourceId} (${ev.ResourceType}): ${ev.ResourceStatus} ${ev.ResourceStatusReason || ''}`.trim();
              await onLog('CF_EVENT', msg);
              lastSeenEventId = ev.EventId;
            }
          }
        } catch (evErr) {
          // ignore event fetch errors
        }

        if (status.endsWith('_COMPLETE')) {
          if (status.includes('ROLLBACK') || status === 'DELETE_COMPLETE') {
            throw new Error(`CloudFormation stack ${stackName} failed with status: ${status}. Reason: ${stack.StackStatusReason || 'Unknown error'}`);
          }
          // Extract outputs
          const outputs = {};
          for (const out of (stack.Outputs || [])) {
            outputs[out.OutputKey] = out.OutputValue;
          }
          return {
            success: true,
            stackId: stack.StackId,
            stackName,
            status,
            outputs,
          };
        }

        if (status.endsWith('_FAILED')) {
          throw new Error(`CloudFormation stack ${stackName} failed with status: ${status}. Reason: ${stack.StackStatusReason || 'Execution failed'}`);
        }

      } catch (err) {
        if (err.message && (err.message.includes('failed with status') || err.message.includes('not found'))) {
          throw err;
        }
      }

      await new Promise(r => setTimeout(r, 4000)); // wait 4 seconds
    }

    throw new Error(`Timeout waiting for CloudFormation stack '${stackName}' to complete.`);
  }

  /**
   * Delete a CloudFormation stack gracefully
   */
  static async deleteStack(clientConfig, stackName, onLog = null) {
    const client = new CloudFormationClient(clientConfig);

    if (onLog) await onLog('DELETE_STACK', `Initiating deletion of CloudFormation stack '${stackName}'...`);
    try {
      await client.send(new DeleteStackCommand({ StackName: stackName }));
      
      // Wait for deletion
      const startTime = Date.now();
      while (Date.now() - startTime < 10 * 60 * 1000) {
        try {
          const desc = await client.send(new DescribeStacksCommand({ StackName: stackName }));
          const stack = desc.Stacks?.[0];
          if (!stack || stack.StackStatus === 'DELETE_COMPLETE') {
            break;
          }
          if (stack.StackStatus === 'DELETE_FAILED') {
            throw new Error(`Stack deletion failed: ${stack.StackStatusReason || 'Resource dependencies prevented deletion'}`);
          }
        } catch (e) {
          if (e.name === 'ValidationError' || e.message?.includes('does not exist')) {
            break; // Stack successfully deleted
          }
        }
        await new Promise(r => setTimeout(r, 4000));
      }

      if (onLog) await onLog('DELETE_STACK_SUCCESS', `CloudFormation stack '${stackName}' deleted successfully.`);
      return { success: true, stackName };
    } catch (err) {
      console.error(`[CloudFormation] Delete stack '${stackName}' failed:`, err.message);
      throw err;
    }
  }

  /**
   * Get stack resources
   */
  static async getStackResources(clientConfig, stackName) {
    const client = new CloudFormationClient(clientConfig);
    try {
      const res = await client.send(new DescribeStackResourcesCommand({ StackName: stackName }));
      return (res.StackResources || []).map(r => ({
        logicalId: r.LogicalResourceId,
        physicalId: r.PhysicalResourceId,
        type: r.ResourceType,
        status: r.ResourceStatus,
        lastUpdated: r.Timestamp,
      }));
    } catch (err) {
      console.warn(`[CloudFormation] DescribeStackResources failed for '${stackName}':`, err.message);
      return [];
    }
  }
}

module.exports = AwsCloudFormationService;
