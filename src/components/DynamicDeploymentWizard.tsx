import React, { useState, useRef, useEffect } from 'react';
import {
  Layers, Cloud, Server, Cpu, Database, Shield, Terminal, CheckCircle2,
  AlertCircle, ChevronRight, ChevronLeft, Download, Box, Code2, HardDrive,
  Globe, Key, Lock, Settings, Sparkles, Upload, Plus, Trash2, Eye, EyeOff,
  FileText, FileCode, Copy
} from 'lucide-react';

export type DeploymentTypeCategory =
  | 'Docker' | 'Docker Compose' | 'Kubernetes' | 'Helm'
  | 'Azure App Service' | 'Azure Container Apps' | 'Azure Functions' | 'Azure Virtual Machine' | 'Azure Static Web Apps'
  | 'AWS ECS' | 'AWS EKS' | 'AWS EC2' | 'AWS Lambda' | 'AWS Elastic Beanstalk' | 'AWS App Runner'
  | 'Google Cloud Run' | 'Google Kubernetes Engine' | 'Google Compute Engine' | 'Google Cloud Functions' | 'Google App Engine'
  | 'Static Website' | 'Bare Metal' | 'On-Prem Kubernetes' | 'Serverless' | 'Microservice';

interface EnvVarRow {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface DynamicDeploymentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appData: any) => void;
  initialData?: any;
}

export const DynamicDeploymentWizard: React.FC<DynamicDeploymentWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [step, setStep] = useState<number>(1);
  const [deploymentType, setDeploymentType] = useState<DeploymentTypeCategory>(initialData?.deployment_type || 'Docker');

  // Common Fields
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [version, setVersion] = useState(initialData?.version || '1.0.0');
  const [repositoryUrl, setRepositoryUrl] = useState(initialData?.repository_url || '');
  const [branch, setBranch] = useState(initialData?.branch || 'main');
  const [runtime, setRuntime] = useState(initialData?.runtime || 'Node.js 20.x');
  const [targetCloud, setTargetCloud] = useState<'azure' | 'aws' | 'gcp' | 'hybrid'>(initialData?.targetCloud || 'azure');
  const [region, setRegion] = useState(initialData?.region || 'eastus');
  const [owner, setOwner] = useState(initialData?.owner || 'Platform DevOps Team');
  const [environment, setEnvironment] = useState<'Development' | 'Testing' | 'Staging' | 'Production'>(initialData?.environment || 'Production');
  const [healthCheckUrl, setHealthCheckUrl] = useState(initialData?.healthCheckUrl || '/health');

  // Render-style Interactive Environment Variables & Secrets State
  const [envRows, setEnvRows] = useState<EnvVarRow[]>([
    { id: '1', key: 'PORT', value: '8080', isSecret: false },
    { id: '2', key: 'NODE_ENV', value: 'production', isSecret: false },
    { id: '3', key: 'DB_PASSWORD', value: 'sec_vault_9912', isSecret: true }
  ]);
  const [envViewMode, setEnvViewMode] = useState<'interactive' | 'raw'>('interactive');
  const [rawEnvText, setRawEnvText] = useState<string>('PORT=8080\nNODE_ENV=production\nDB_PASSWORD=sec_vault_9912');
  const [envSuccessMsg, setEnvSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Specific Adaptive Fields
  // Container fields
  const [containerImage, setContainerImage] = useState(initialData?.container_image || 'ghcr.io/cloudops/app:v1.0.0');
  const [dockerfile, setDockerfile] = useState(initialData?.specDetails?.dockerfile || 'Dockerfile');
  const [buildContext, setBuildContext] = useState(initialData?.specDetails?.buildContext || '.');
  const [registry, setRegistry] = useState(initialData?.specDetails?.registry || 'docker.io');
  const [ports, setPorts] = useState(initialData?.specDetails?.ports || '8080');

  // Docker Compose
  const [dockerComposeContent, setDockerComposeContent] = useState(initialData?.specDetails?.dockerComposeContent || 'version: "3.8"\nservices:\n  app:\n    image: node:20-alpine');

  // Kubernetes / Helm
  const [namespace, setNamespace] = useState(initialData?.specDetails?.namespace || 'production');
  const [replicas, setReplicas] = useState(initialData?.specDetails?.replicas || 3);
  const [helmChartRepo, setHelmChartRepo] = useState(initialData?.specDetails?.helmChartRepo || 'https://charts.bitnami.com/bitnami');
  const [releaseName, setReleaseName] = useState(initialData?.specDetails?.releaseName || 'app-release');

  // Virtual Machines (Azure VM, AWS EC2, GCP Compute Engine)
  const [vmName, setVmName] = useState(initialData?.specDetails?.vmName || 'vm-cloudops-01');
  const [vmImage, setVmImage] = useState(initialData?.specDetails?.vmImage || 'Ubuntu 22.04 LTS');
  const [vmSize, setVmSize] = useState(initialData?.specDetails?.vmSize || 'Standard_B2s');
  const [authMethod, setAuthMethod] = useState<'ssh' | 'password'>(initialData?.specDetails?.authMethod || 'ssh');
  const [sshPublicKey, setSshPublicKey] = useState(initialData?.specDetails?.sshPublicKey || 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...');
  const [resourceGroup, setResourceGroup] = useState(initialData?.specDetails?.resourceGroup || 'rg-cloudops-prod');
  const [vnetName, setVnetName] = useState(initialData?.specDetails?.vnetName || 'vnet-cloudops-eastus');
  const [subnetName, setSubnetName] = useState(initialData?.specDetails?.subnetName || 'subnet-app');

  // Azure App Service / Functions / Lambda
  const [appServicePlan, setAppServicePlan] = useState(initialData?.specDetails?.appServicePlan || 'asp-cloudops-p1v2');
  const [pricingTier, setPricingTier] = useState(initialData?.specDetails?.pricingTier || 'P1v2');
  const [functionHandler, setFunctionHandler] = useState(initialData?.specDetails?.functionHandler || 'index.handler');
  const [timeoutSec, setTimeoutSec] = useState(initialData?.specDetails?.timeoutSec || 30);
  const [memoryMb, setMemoryMb] = useState(initialData?.specDetails?.memoryMb || 512);

  // Static Website
  const [staticFramework, setStaticFramework] = useState(initialData?.specDetails?.staticFramework || 'React');
  const [buildCommand, setBuildCommand] = useState(initialData?.specDetails?.buildCommand || 'npm run build');
  const [outputDirectory, setOutputDirectory] = useState(initialData?.specDetails?.outputDirectory || 'dist');
  const [customDomain, setCustomDomain] = useState(initialData?.specDetails?.customDomain || 'app.cloudops.internal');

  // Analysis & Validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<any>(null);
  const [autoDictatedBadge, setAutoDictatedBadge] = useState<boolean>(false);

  // Sync interactive rows to raw text
  const updateRawFromRows = (rows: EnvVarRow[]) => {
    const text = rows
      .filter(r => r.key.trim() !== '')
      .map(r => `${r.key.trim()}=${r.value}`)
      .join('\n');
    setRawEnvText(text);
  };

  // Sync raw text to interactive rows
  const parseAndSetEnvText = (text: string, filename?: string) => {
    const lines = text.split('\n');
    const newRows: EnvVarRow[] = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          const isSec = key.toUpperCase().includes('SECRET') || key.toUpperCase().includes('PASS') || key.toUpperCase().includes('KEY') || key.toUpperCase().includes('TOKEN');
          newRows.push({
            id: `env-${Date.now()}-${idx}`,
            key,
            value: val,
            isSecret: isSec
          });
        }
      }
    });

    if (newRows.length > 0) {
      setEnvRows(newRows);
      setRawEnvText(text);
      setEnvSuccessMsg(filename ? `✅ Loaded ${newRows.length} environment variables from '${filename}'!` : `✅ Parsed ${newRows.length} environment variables!`);
      setTimeout(() => setEnvSuccessMsg(null), 5000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseAndSetEnvText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleAddEnvRow = () => {
    const newRow: EnvVarRow = {
      id: `env-${Date.now()}`,
      key: '',
      value: '',
      isSecret: false
    };
    const updated = [...envRows, newRow];
    setEnvRows(updated);
    updateRawFromRows(updated);
  };

  const handleUpdateEnvRow = (id: string, field: 'key' | 'value' | 'isSecret', val: any) => {
    const updated = envRows.map(r => r.id === id ? { ...r, [field]: val } : r);
    setEnvRows(updated);
    updateRawFromRows(updated);
  };

  const handleDeleteEnvRow = (id: string) => {
    const updated = envRows.filter(r => r.id !== id);
    setEnvRows(updated);
    updateRawFromRows(updated);
  };

  // Automated Repository Dictation Engine
  const applyInferredMetadata = (urlToUse: string, rep?: any) => {
    const rawRepoName = urlToUse.split('/').pop()?.replace('.git', '') || 'PORTFOLIO';
    const formattedName = rawRepoName.toUpperCase();
    const isStatic = (rawRepoName.toLowerCase().includes('portfolio') ||
      rawRepoName.toLowerCase().includes('static') ||
      rawRepoName.toLowerCase().includes('frontend') ||
      rawRepoName.toLowerCase().includes('ui') ||
      rawRepoName.toLowerCase().includes('web') ||
      rep?.deploymentTypeRecommendation === 'Azure Static Web Apps');

    const recommendedType = rep?.deploymentTypeRecommendation || (isStatic ? 'Azure Static Web Apps' : 'Docker');

    // Preserve custom name if user already entered one
    setName(prev => (!prev || prev === 'PORTFOLIO' || prev === 'APP' ? formattedName : prev));
    setVersion(prev => prev || '1.0.0');
    setDescription(prev => prev || `Auto-configured ${rep?.framework || (isStatic ? 'Static Portfolio Website' : 'Application')} from ${urlToUse}`);
    setBranch(prev => rep?.branch || prev || 'main');
    setRuntime(rep?.language || (isStatic ? 'HTML5 / JavaScript / React' : 'Node.js 20.x'));
    setDeploymentType(recommendedType as DeploymentTypeCategory);
    setBuildCommand(rep?.buildCommand || 'npm run build');
    setOutputDirectory(rep?.outputDirectory || 'dist');
    setStaticFramework('React');
    setContainerImage(`ghcr.io/cloudops/${rawRepoName.toLowerCase()}:v1.0.0`);
    setHealthCheckUrl('/');
    setTimeoutSec(30);
    setMemoryMb(512);
    setReplicas(2);
    setAutoDictatedBadge(true);

    if (rep) {
      setAnalysisReport(rep);
    } else {
      setAnalysisReport({
        framework: isStatic ? 'React / Vite SPA' : 'Full-Stack Application',
        language: isStatic ? 'HTML5 / CSS3 / JavaScript' : 'JavaScript / TypeScript',
        deploymentTypeRecommendation: recommendedType,
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        requiresDocker: !isStatic
      });
    }

    if (rep?.envVars && typeof rep.envVars === 'object') {
      const dictEnvRows: EnvVarRow[] = Object.entries(rep.envVars).map(([k, v], i) => ({
        id: `dict-${i}`,
        key: k,
        value: String(v),
        isSecret: k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('PASS')
      }));
      dictEnvRows.push({ id: 'dict-app', key: 'APPLICATION_NAME', value: formattedName, isSecret: false });
      setEnvRows(dictEnvRows);
      updateRawFromRows(dictEnvRows);
    }
  };

  const handleAnalyzeRepo = async (targetRepoUrl?: string) => {
    const urlToUse = targetRepoUrl || repositoryUrl;
    if (!urlToUse || !urlToUse.trim()) return;

    setAnalyzingRepo(true);
    setValidationError(null);
    try {
      const token = localStorage.getItem('cloudops-local-token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/applications/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ repositoryUrl: urlToUse.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        applyInferredMetadata(urlToUse.trim(), data.data);
      } else {
        applyInferredMetadata(urlToUse.trim());
      }
    } catch (err: any) {
      console.warn('Remote repository analysis fallback active:', err.message);
      applyInferredMetadata(urlToUse.trim());
    } finally {
      setAnalyzingRepo(false);
    }
  };

  // Safe URL cleaner - removes accidental double pastes or duplicate https:// prefixes
  const cleanGitUrl = (raw: string): string => {
    let cleaned = (raw || '').trim();
    const matches = cleaned.match(/https?:\/\/[^\s]+/gi);
    if (matches && matches.length > 0) {
      cleaned = matches[0];
      const secondHttp = cleaned.indexOf('http', 4);
      if (secondHttp !== -1) {
        cleaned = cleaned.substring(0, secondHttp);
      }
    }
    return cleaned;
  };

  // Safe input handler - avoids resetting form state on every keystroke
  const handleRepoUrlChange = (val: string) => {
    setRepositoryUrl(cleanGitUrl(val));
  };

  const handleRepoUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = cleanGitUrl(e.clipboardData.getData('text'));
    if (pasted) {
      setRepositoryUrl(pasted);
      setTimeout(() => {
        handleAnalyzeRepo(pasted);
      }, 50);
    }
  };

  if (!isOpen) return null;

  // Determine if this deployment type uses containers
  const isContainerBased = [
    'Docker', 'Docker Compose', 'Kubernetes', 'Helm',
    'Azure Container Apps', 'AWS ECS', 'AWS EKS', 'AWS App Runner',
    'Google Cloud Run', 'Google Kubernetes Engine', 'Microservice'
  ].includes(deploymentType);

  // Determine if VM based
  const isVmBased = ['Azure Virtual Machine', 'AWS EC2', 'Google Compute Engine', 'Bare Metal'].includes(deploymentType);

  // Determine if Function / Serverless based
  const isFunctionBased = ['Azure Functions', 'AWS Lambda', 'Google Cloud Functions', 'Serverless'].includes(deploymentType);

  // Determine if Static Website based
  const isStaticWeb = ['Azure Static Web Apps', 'Static Website'].includes(deploymentType);

  // Determine if Azure App Service based
  const isAppService = ['Azure App Service', 'AWS Elastic Beanstalk', 'Google App Engine'].includes(deploymentType);

  const validateCurrentStep = () => {
    setValidationError(null);

    if (step === 1) {
      if (!name.trim()) {
        setValidationError('Application Name is required.');
        return false;
      }
      if (!version.trim()) {
        setValidationError('Version is required.');
        return false;
      }
    }

    if (step === 2) {
      if (isContainerBased && !containerImage.trim()) {
        setValidationError('Container Image is required for containerized deployment types.');
        return false;
      }
      if (isVmBased) {
        if (!vmName.trim()) {
          setValidationError('VM Name is required.');
          return false;
        }
        if (!vmImage.trim()) {
          setValidationError('OS / Machine Image selection is required.');
          return false;
        }
      }
      if (isFunctionBased && !functionHandler.trim()) {
        setValidationError('Function Handler is required for Serverless Functions.');
        return false;
      }
      if (isStaticWeb) {
        if (!buildCommand.trim()) {
          setBuildCommand('npm run build');
        }
        if (!outputDirectory.trim()) {
          setOutputDirectory('dist');
        }
      }
      if (['Kubernetes', 'Helm', 'AWS EKS', 'Google Kubernetes Engine', 'On-Prem Kubernetes'].includes(deploymentType) && !namespace.trim()) {
        setValidationError('Kubernetes Namespace is required.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    // Build Environment Objects from envRows
    const parsedEnv: Record<string, string> = {};
    const parsedSecrets: Record<string, string> = {};

    envRows.forEach(r => {
      if (r.key.trim()) {
        if (r.isSecret) {
          parsedSecrets[r.key.trim()] = r.value.trim();
        } else {
          parsedEnv[r.key.trim()] = r.value.trim();
        }
      }
    });

    const specDetails = {
      dockerfile, buildContext, registry, ports, dockerComposeContent,
      namespace, replicas, helmChartRepo, releaseName,
      vmName, vmImage, vmSize, authMethod, sshPublicKey, resourceGroup, vnetName, subnetName,
      appServicePlan, pricingTier, functionHandler, timeoutSec, memoryMb,
      staticFramework, buildCommand, outputDirectory, customDomain
    };

    onSave({
      name,
      description,
      version,
      repository_url: repositoryUrl,
      branch,
      runtime,
      targetCloud,
      region,
      owner,
      environment,
      healthCheckUrl,
      container_image: isContainerBased ? containerImage : 'N/A (Non-container workload)',
      deployment_type: deploymentType,
      deployment_strategy: 'Rolling',
      envVars: parsedEnv,
      secrets: parsedSecrets,
      specDetails
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Azure Portal / AWS Console Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">Create Enterprise Application Spec</h2>
              <p className="text-xs text-slate-400">Dynamic Multi-Cloud Provisioning Wizard (Azure / AWS / GCP)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
        </div>

        {/* Wizard Steps Navigation Header */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-600">
          <span className={step === 1 ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1' : ''}>1. Basics</span>
          <span>→</span>
          <span className={step === 2 ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1' : ''}>2. Infrastructure Spec</span>
          <span>→</span>
          <span className={step === 3 ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1' : ''}>3. Env & Secrets</span>
          <span>→</span>
          <span className={step === 4 ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1' : ''}>4. Health & Scaling</span>
          <span>→</span>
          <span className={step === 5 ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1' : ''}>5. Review & Create</span>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {validationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-2 flex items-center justify-between">
                <span>Project & Repository Setup</span>
                {autoDictatedBadge && (
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Repository Auto-Dictated
                  </span>
                )}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>GitHub Repository URL</span>
                  <span className="text-[11px] text-blue-600 font-normal">Pasting URL automatically dictates and fills all fields!</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={repositoryUrl}
                      onChange={(e) => handleRepoUrlChange(e.target.value)}
                      onPaste={handleRepoUrlPaste}
                      placeholder="https://github.com/ShaikMohammedSameer3903/PORTFOLIO.git"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-blue-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAnalyzeRepo()}
                    disabled={analyzingRepo || !repositoryUrl.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm transition"
                  >
                    {analyzingRepo ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {analyzingRepo ? 'Dictating & Analyzing...' : 'Auto-Dictate Stack'}
                  </button>
                </div>

                {analysisReport && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2 shadow-xs">
                    <div className="font-bold flex items-center justify-between text-emerald-950">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Repository Dictation & Inspection Complete</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">All Fields Populated</span>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[11px] bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                      <div><strong>Framework:</strong> {analysisReport.framework}</div>
                      <div><strong>Language:</strong> {analysisReport.language}</div>
                      <div><strong>Recommended Target:</strong> {analysisReport.deploymentTypeRecommendation}</div>
                      <div><strong>Build Command:</strong> <code className="text-blue-700">{analysisReport.buildCommand}</code></div>
                      <div><strong>Output Dir:</strong> <code className="text-purple-700">{analysisReport.outputDirectory}</code></div>
                      <div><strong>Container:</strong> {analysisReport.requiresDocker ? 'Docker Container' : 'Static Web App'}</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Deployment Type *</label>
                <select
                  value={deploymentType}
                  onChange={(e) => {
                    const selected = e.target.value as DeploymentTypeCategory;
                    setDeploymentType(selected);
                    if (selected.startsWith('AWS') && targetCloud !== 'aws') {
                      setTargetCloud('aws');
                      setRegion('us-east-1');
                    } else if ((selected.startsWith('Google') || selected.startsWith('GCP')) && targetCloud !== 'gcp') {
                      setTargetCloud('gcp');
                      setRegion('us-central1');
                    } else if (selected.startsWith('Azure') && targetCloud !== 'azure') {
                      setTargetCloud('azure');
    setRegion('southeastasia');
                      setRegion('southeastasia');
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:border-blue-500"
                >
                  <optgroup label="Container Platforms">
                    <option value="Docker">Docker Container</option>
                    <option value="Docker Compose">Docker Compose</option>
                    <option value="Kubernetes">Kubernetes</option>
                    <option value="Helm">Helm Chart</option>
                    <option value="Microservice">Microservice</option>
                  </optgroup>
                  <optgroup label="Microsoft Azure">
                    <option value="Azure App Service">Azure App Service</option>
                    <option value="Azure Container Apps">Azure Container Apps</option>
                    <option value="Azure Functions">Azure Functions</option>
                    <option value="Azure Virtual Machine">Azure Virtual Machine (VM)</option>
                    <option value="Azure Static Web Apps">Azure Static Web Apps</option>
                  </optgroup>
                  <optgroup label="Amazon Web Services (AWS)">
                    <option value="AWS ECS">AWS ECS Fargate</option>
                    <option value="AWS EKS">AWS EKS Cluster</option>
                    <option value="AWS EC2">AWS EC2 Instance</option>
                    <option value="AWS Lambda">AWS Lambda</option>
                    <option value="AWS Elastic Beanstalk">AWS Elastic Beanstalk</option>
                    <option value="AWS App Runner">AWS App Runner</option>
                  </optgroup>
                  <optgroup label="Google Cloud Platform (GCP)">
                    <option value="Google Cloud Run">Google Cloud Run</option>
                    <option value="Google Kubernetes Engine">Google Kubernetes Engine (GKE)</option>
                    <option value="Google Compute Engine">Google Compute Engine (GCE)</option>
                    <option value="Google Cloud Functions">Google Cloud Functions</option>
                    <option value="Google App Engine">Google App Engine</option>
                  </optgroup>
                  <optgroup label="Static & On-Premise">
                    <option value="Static Website">Static Website (React/Vite/HTML)</option>
                    <option value="Bare Metal">Bare Metal Server</option>
                    <option value="On-Prem Kubernetes">On-Premise Kubernetes</option>
                    <option value="Serverless">Generic Serverless</option>
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Form fields dynamically adapt to {deploymentType}.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Enterprise Payment API"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Version *</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Application purpose, business function, or team ownership details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Cloud</label>
                  <select
                    value={targetCloud}
                    onChange={(e) => {
                      const c = e.target.value as any;
                      setTargetCloud(c);
                      if (c === 'aws') setRegion('us-east-1');
                      else if (c === 'gcp') setRegion('us-central1');
                      else if (c === 'azure') setRegion('southeastasia');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="azure">Azure</option>
                    <option value="aws">AWS</option>
                    <option value="gcp">GCP</option>
                    <option value="hybrid">Multi-Cloud Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Development">Development</option>
                    <option value="Testing">Testing</option>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INFRASTRUCTURE SPECIFICATION */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-2">Adaptive Infrastructure Specifications for {deploymentType}</h3>

              {/* CONTAINER BASED FIELDS */}
              {isContainerBased && (
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <span className="text-xs font-bold text-blue-900 uppercase block">Container Image & Registry Spec</span>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Container Image Artifact *</label>
                    <input
                      type="text"
                      required
                      value={containerImage}
                      onChange={(e) => setContainerImage(e.target.value)}
                      placeholder="ghcr.io/cloudops/app:v1.0.0"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-blue-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Image Registry</label>
                      <input
                        type="text"
                        value={registry}
                        onChange={(e) => setRegistry(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Exposed Ports</label>
                      <input
                        type="text"
                        value={ports}
                        onChange={(e) => setPorts(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* VIRTUAL MACHINE BASED FIELDS */}
              {isVmBased && (
                <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">
                  <span className="text-xs font-bold text-amber-900 uppercase block">Virtual Machine Hardware Spec (No Container Image Needed)</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">VM Instance Name *</label>
                      <input
                        type="text"
                        required
                        value={vmName}
                        onChange={(e) => setVmName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">OS / Machine Image *</label>
                      <select
                        value={vmImage}
                        onChange={(e) => setVmImage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS</option>
                        <option value="Windows Server 2022 Datacenter">Windows Server 2022 Datacenter</option>
                        <option value="RedHat Enterprise Linux 9">RedHat Enterprise Linux 9</option>
                        <option value="Debian 12 Bookworm">Debian 12 Bookworm</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">VM Hardware Size / SKU</label>
                      <select
                        value={vmSize}
                        onChange={(e) => setVmSize(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      >
                        <option value="Standard_B2s">Standard_B2s (2 vCPU, 4 GiB RAM)</option>
                        <option value="Standard_D2s_v5">Standard_D2s_v5 (2 vCPU, 8 GiB RAM)</option>
                        <option value="Standard_E2s_v5">Standard_E2s_v5 (2 vCPU, 16 GiB RAM)</option>
                        <option value="t3.medium">AWS t3.medium (2 vCPU, 4 GiB RAM)</option>
                        <option value="e2-standard-2">GCP e2-standard-2 (2 vCPU, 8 GiB RAM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Virtual Network / Subnet</label>
                      <input
                        type="text"
                        value={vnetName}
                        onChange={(e) => setVnetName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* FUNCTION / SERVERLESS FIELDS */}
              {isFunctionBased && (
                <div className="space-y-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  <span className="text-xs font-bold text-purple-900 uppercase block">Serverless Function Configuration</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Function Handler *</label>
                      <input
                        type="text"
                        required
                        value={functionHandler}
                        onChange={(e) => setFunctionHandler(e.target.value)}
                        placeholder="index.handler or main.lambda_handler"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs text-purple-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Memory Allocation (MB)</label>
                      <input
                        type="number"
                        value={memoryMb}
                        onChange={(e) => setMemoryMb(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STATIC WEBSITE FIELDS */}
              {isStaticWeb && (
                <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-900 uppercase block">Static Website Build Spec</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Build Command *</label>
                      <input
                        type="text"
                        required
                        value={buildCommand}
                        onChange={(e) => setBuildCommand(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Output Directory *</label>
                      <input
                        type="text"
                        required
                        value={outputDirectory}
                        onChange={(e) => setOutputDirectory(e.target.value)}
                        placeholder="dist, build, or out"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* KUBERNETES / HELM FIELDS */}
              {['Kubernetes', 'Helm', 'AWS EKS', 'Google Kubernetes Engine', 'On-Prem Kubernetes'].includes(deploymentType) && (
                <div className="space-y-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800 uppercase block">Kubernetes Cluster Metadata</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Namespace *</label>
                      <input
                        type="text"
                        required
                        value={namespace}
                        onChange={(e) => setNamespace(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Replicas</label>
                      <input
                        type="number"
                        value={replicas}
                        onChange={(e) => setReplicas(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RENDER-STYLE ENVIRONMENT VARIABLES & SECRETS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Environment Variables & Secrets</h3>
                  <p className="text-xs text-slate-500">Configure key-value environment variables, upload <code className="text-blue-600 font-bold">.env</code> files, or paste bulk secrets like Render & Vercel.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvViewMode('interactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${envViewMode === 'interactive' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Interactive Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvViewMode('raw')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${envViewMode === 'raw' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <FileCode className="w-3.5 h-3.5" /> Raw .env View
                  </button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".env,.env.*,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Upload className="w-4 h-4" /> Upload .env File
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEnvRow}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" /> Add Variable
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => parseAndSetEnvText("PORT=8080\nNODE_ENV=production\nLOG_LEVEL=info")}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-md font-mono"
                  >
                    Standard Node
                  </button>
                  <button
                    type="button"
                    onClick={() => parseAndSetEnvText("DATABASE_URL=postgresql://user:pass@host:5432/dbname\nREDIS_URL=redis://localhost:6379")}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-md font-mono"
                  >
                    Database URLs
                  </button>
                </div>
              </div>

              {envSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{envSuccessMsg}</span>
                </div>
              )}

              {/* VIEW MODE 1: INTERACTIVE KEY-VALUE TABLE (RENDER STYLE) */}
              {envViewMode === 'interactive' ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 grid grid-cols-12 gap-3 text-xs font-bold text-slate-700 uppercase">
                    <div className="col-span-5">Key / Variable Name</div>
                    <div className="col-span-5">Value</div>
                    <div className="col-span-2 text-right">Actions / Secret</div>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto bg-white">
                    {envRows.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No environment variables defined. Click <strong>Upload .env File</strong> or <strong>Add Variable</strong> to get started.
                      </div>
                    ) : (
                      envRows.map((row) => (
                        <div key={row.id} className="p-2.5 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/80 transition">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={row.key}
                              onChange={(e) => handleUpdateEnvRow(row.id, 'key', e.target.value)}
                              placeholder="e.g. API_KEY"
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type={row.isSecret ? 'password' : 'text'}
                              value={row.value}
                              onChange={(e) => handleUpdateEnvRow(row.id, 'value', e.target.value)}
                              placeholder="value"
                              className={`w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-blue-500 ${row.isSecret ? 'bg-purple-50/50 text-purple-900' : 'bg-slate-50 text-slate-900'}`}
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateEnvRow(row.id, 'isSecret', !row.isSecret)}
                              title={row.isSecret ? 'Mark as regular variable' : 'Mark as encrypted secret'}
                              className={`p-1.5 rounded-md transition ${row.isSecret ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                              {row.isSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEnvRow(row.id)}
                              title="Delete variable"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
                    <span>{envRows.length} total environment variables configured</span>
                    <span>Values marked with <EyeOff className="w-3 h-3 inline text-purple-600" /> will be encrypted in Azure Key Vault / AWS Secrets Manager</span>
                  </div>
                </div>
              ) : (
                /* VIEW MODE 2: RAW TEXT AREA FOR BULK PASTE */
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600 font-semibold">
                    <span>Bulk Paste Raw .env File Content (KEY=VALUE per line)</span>
                    <button
                      type="button"
                      onClick={() => parseAndSetEnvText(rawEnvText)}
                      className="text-blue-600 hover:underline text-[11px] font-bold"
                    >
                      Sync to Table View
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={rawEnvText}
                    onChange={(e) => {
                      setRawEnvText(e.target.value);
                      parseAndSetEnvText(e.target.value);
                    }}
                    placeholder="PORT=8080&#10;NODE_ENV=production&#10;DATABASE_URL=postgresql://user:pass@localhost:5432/db"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-blue-300 font-mono text-xs rounded-xl focus:border-blue-500 shadow-inner"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 4: HEALTH CHECK & AUTOSCALING */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-2">Liveness Probe & Telemetry Configuration</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Health Check Probe Endpoint</label>
                <input
                  type="text"
                  value={healthCheckUrl}
                  onChange={(e) => setHealthCheckUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Engineering Team</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b pb-2">Review Deployment Specification</h3>
              <div className="bg-slate-950 p-4 rounded-xl text-xs space-y-2 font-mono text-slate-300 border border-slate-800">
                <p><span className="text-slate-500">Name:</span> <span className="text-white font-bold">{name}</span></p>
                <p><span className="text-slate-500">Version:</span> <span className="text-blue-400">{version}</span></p>
                <p><span className="text-slate-500">Deployment Type:</span> <span className="text-purple-400 font-bold">{deploymentType}</span></p>
                <p><span className="text-slate-500">Target Cloud:</span> <span className="text-emerald-400 uppercase">{targetCloud} ({region})</span></p>
                <p><span className="text-slate-500">Environment Variables:</span> <span className="text-amber-400 font-bold">{envRows.length} configured</span></p>
                {isContainerBased && <p><span className="text-slate-500">Container Image:</span> <span className="text-amber-400">{containerImage}</span></p>}
                {isVmBased && <p><span className="text-slate-500">VM Name & Image:</span> <span className="text-amber-400">{vmName} ({vmImage})</span></p>}
                {isFunctionBased && <p><span className="text-slate-500">Function Handler:</span> <span className="text-amber-400">{functionHandler}</span></p>}
                {isStaticWeb && <p><span className="text-slate-500">Build Command:</span> <span className="text-amber-400">{buildCommand} ({outputDirectory})</span></p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition shadow-sm"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" /> Create Application Specification
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicDeploymentWizard;
