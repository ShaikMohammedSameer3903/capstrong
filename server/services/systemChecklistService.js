const { execSync } = require('child_process');
const { getDatabase } = require('../db/database');

const CLI_TOOLS = [
  {
    name: 'Node.js',
    command: 'node -v',
    downloadUrl: 'https://nodejs.org/en/download/',
    installCmd: 'winget install OpenJS.NodeJS / curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs',
    verifyCmd: 'node -v'
  },
  {
    name: 'npm',
    command: 'npm -v',
    downloadUrl: 'https://www.npmjs.com/get-npm',
    installCmd: 'npm install -g npm@latest',
    verifyCmd: 'npm -v'
  },
  {
    name: 'pnpm',
    command: 'pnpm -v',
    downloadUrl: 'https://pnpm.io/installation',
    installCmd: 'npm install -g pnpm',
    verifyCmd: 'pnpm -v'
  },
  {
    name: 'Docker',
    command: 'docker -v',
    downloadUrl: 'https://docs.docker.com/get-docker/',
    installCmd: 'winget install Docker.DockerDesktop / sudo apt-get install docker-ce docker-ce-cli containerd.io',
    verifyCmd: 'docker info'
  },
  {
    name: 'kubectl',
    command: 'kubectl version --client -o json',
    downloadUrl: 'https://kubernetes.io/docs/tasks/tools/',
    installCmd: 'winget install Kubernetes.kubectl / sudo snap install kubectl --classic',
    verifyCmd: 'kubectl version --client'
  },
  {
    name: 'Azure CLI',
    command: 'az --version',
    downloadUrl: 'https://learn.microsoft.com/en-us/cli/azure/install-azure-cli',
    installCmd: 'winget install Microsoft.AzureCLI / curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash',
    verifyCmd: 'az version'
  },
  {
    name: 'AWS CLI',
    command: 'aws --version',
    downloadUrl: 'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html',
    installCmd: 'winget install Amazon.AWSCLI / sudo apt install awscli',
    verifyCmd: 'aws --version'
  },
  {
    name: 'gcloud CLI',
    command: 'gcloud --version',
    downloadUrl: 'https://cloud.google.com/sdk/docs/install',
    installCmd: 'winget install Google.CloudSDK / snap install google-cloud-cli --classic',
    verifyCmd: 'gcloud --version'
  },
  {
    name: 'Git',
    command: 'git --version',
    downloadUrl: 'https://git-scm.com/downloads',
    installCmd: 'winget install Git.Git / sudo apt install git',
    verifyCmd: 'git --version'
  },
  {
    name: 'Terraform',
    command: 'terraform -v',
    downloadUrl: 'https://developer.hashicorp.com/terraform/downloads',
    installCmd: 'winget install HashiCorp.Terraform / sudo apt install terraform',
    verifyCmd: 'terraform -v'
  },
  {
    name: 'Helm',
    command: 'helm version',
    downloadUrl: 'https://helm.sh/docs/intro/install/',
    installCmd: 'winget install Helm.Helm / sudo snap install helm --classic',
    verifyCmd: 'helm version'
  }
];

class SystemChecklistService {
  /**
   * Diagnostic check for all CLI tools on the host system
   */
  checkSystemTools() {
    const results = [];

    for (const tool of CLI_TOOLS) {
      let status = 'MISSING';
      let version = null;

      try {
        const output = execSync(tool.command, { stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000, encoding: 'utf8' });
        status = 'INSTALLED';
        version = output.trim().split('\n')[0];
      } catch (err) {
        status = 'MISSING';
      }

      results.push({
        toolName: tool.name,
        status,
        version,
        downloadUrl: tool.downloadUrl,
        installCommand: tool.installCmd,
        verificationCommand: tool.verifyCmd
      });
    }

    return results;
  }

  /**
   * Run full Pre-Deployment Diagnostic Checklist
   * @param {string} targetCloud 'azure' | 'aws' | 'gcp'
   * @param {string} namespace Target K8s namespace
   */
  async runPreDeploymentChecklist(targetCloud = 'azure', namespace = 'default') {
    const checks = [];

    // 1. Docker Binary Check
    let hasDocker = false;
    try {
      execSync('docker -v', { stdio: 'ignore', timeout: 2000 });
      hasDocker = true;
      checks.push({ name: 'Docker Installed', passed: true, message: 'Docker CLI binary detected on system path.' });
    } catch (e) {
      checks.push({
        name: 'Docker Installed',
        passed: false,
        message: 'Docker CLI is not installed or not available on PATH.',
        howToFix: 'Install Docker Desktop (https://docs.docker.com/get-docker/) or run: winget install Docker.DockerDesktop'
      });
    }

    // 2. Docker Daemon Running Check
    if (hasDocker) {
      try {
        execSync('docker info', { stdio: 'ignore', timeout: 3000 });
        checks.push({ name: 'Docker Daemon Running', passed: true, message: 'Docker Engine daemon is active and responsive.' });
      } catch (e) {
        checks.push({
          name: 'Docker Daemon Running',
          passed: false,
          message: 'Docker binary present but Docker daemon is stopped.',
          howToFix: 'Start Docker Desktop application or run: sudo systemctl start docker'
        });
      }
    } else {
      checks.push({ name: 'Docker Daemon Running', passed: false, message: 'Skipped (Docker binary missing)', howToFix: 'Install Docker first.' });
    }

    // 3. kubectl Installed Check
    let hasKubectl = false;
    try {
      execSync('kubectl version --client', { stdio: 'ignore', timeout: 2000 });
      hasKubectl = true;
      checks.push({ name: 'kubectl Installed', passed: true, message: 'Kubernetes CLI (kubectl) detected.' });
    } catch (e) {
      checks.push({
        name: 'kubectl Installed',
        passed: false,
        message: 'kubectl is not installed.',
        howToFix: 'Install kubectl (https://kubernetes.io/docs/tasks/tools/) or run: winget install Kubernetes.kubectl'
      });
    }

    // 4. Cluster Reachable Check
    if (hasKubectl) {
      try {
        execSync('kubectl cluster-info', { stdio: 'ignore', timeout: 3000 });
        checks.push({ name: 'Kubernetes Cluster Reachable', passed: true, message: 'Successfully connected to target Kubernetes cluster control plane.' });
      } catch (e) {
        checks.push({
          name: 'Kubernetes Cluster Reachable',
          passed: false,
          message: 'Cannot reach Kubernetes cluster via current kubeconfig context.',
          howToFix: 'Configure valid kubeconfig context or connect to cluster using: az aks get-credentials / aws eks update-kubeconfig / gcloud container clusters get-credentials'
        });
      }
    } else {
      checks.push({ name: 'Kubernetes Cluster Reachable', passed: false, message: 'Skipped (kubectl missing)', howToFix: 'Install kubectl and configure cluster credentials.' });
    }

    // 5. Cloud Credentials Check
    const db = await getDatabase();
    const cloudAcc = await db.get(`SELECT * FROM cloud_accounts WHERE LOWER(provider) = ? AND status = 'Active' LIMIT 1`, [targetCloud.toLowerCase()]);
    if (cloudAcc || process.env[`${targetCloud.toUpperCase()}_SUBSCRIPTION_ID`] || process.env[`${targetCloud.toUpperCase()}_ACCESS_KEY_ID`]) {
      checks.push({ name: 'Cloud Credentials Valid', passed: true, message: `Active ${targetCloud.toUpperCase()} credentials detected.` });
    } else {
      checks.push({
        name: 'Cloud Credentials Valid',
        passed: false,
        message: `No active credentials found for cloud provider: ${targetCloud.toUpperCase()}.`,
        howToFix: `Navigate to Cloud Accounts wizard and configure valid credentials for ${targetCloud.toUpperCase()}.`
      });
    }

    // 6. Internet Connection Check
    try {
      execSync('ping -n 1 8.8.8.8', { stdio: 'ignore', timeout: 2000 });
      checks.push({ name: 'Internet Connectivity', passed: true, message: 'Host network internet connectivity verified.' });
    } catch (e) {
      checks.push({ name: 'Internet Connectivity', passed: false, message: 'Ping check failed or internet disconnected.', howToFix: 'Verify network connection and proxy settings.' });
    }

    // Overall outcome
    const allPassed = checks.every(c => c.passed);

    return {
      targetCloud,
      namespace,
      timestamp: new Date().toISOString(),
      allPassed,
      failedCount: checks.filter(c => !c.passed).length,
      checklist: checks
    };
  }
}

module.exports = new SystemChecklistService();
