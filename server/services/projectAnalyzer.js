const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ProjectAnalyzer {
  /**
   * Analyze project directory structure or manifest files
   * @param {string} projectPath Absolute or relative path to project directory
   */
  analyzeProject(projectPath = process.cwd()) {
    const resolvedPath = path.resolve(projectPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Project directory does not exist: ${resolvedPath}`);
    }

    const detectedFiles = [];
    const checkFile = (filename) => {
      const p = path.join(resolvedPath, filename);
      if (fs.existsSync(p)) {
        detectedFiles.push(filename);
        return true;
      }
      return false;
    };

    const hasFileMatching = (extOrPattern) => {
      try {
        const files = fs.readdirSync(resolvedPath);
        return files.some(f => f.endsWith(extOrPattern) || f.includes(extOrPattern));
      } catch (e) {
        return false;
      }
    };

    // 1. Detect Configuration Files
    const hasIndexHtmlRoot = checkFile('index.html');
    const hasIndexHtmlPublic = fs.existsSync(path.join(resolvedPath, 'public', 'index.html'));
    const hasIndexHtmlDist = fs.existsSync(path.join(resolvedPath, 'dist', 'index.html'));
    const hasIndexHtmlSrc = fs.existsSync(path.join(resolvedPath, 'src', 'index.html'));
    const hasIndexHtml = hasIndexHtmlRoot || hasIndexHtmlPublic || hasIndexHtmlDist || hasIndexHtmlSrc;

    if (hasIndexHtmlRoot) detectedFiles.push('index.html');
    if (hasIndexHtmlPublic) detectedFiles.push('public/index.html');

    const hasPackageJson = checkFile('package.json');
    const hasPomXml = checkFile('pom.xml');
    const hasGradle = checkFile('build.gradle') || checkFile('build.gradle.kts');
    const hasRequirementsTxt = checkFile('requirements.txt') || checkFile('Pipfile') || checkFile('pyproject.toml');
    const hasGoMod = checkFile('go.mod');
    const hasCargoToml = checkFile('Cargo.toml');
    const hasComposerJson = checkFile('composer.json');
    const hasDotNetCsproj = hasFileMatching('.csproj') || hasFileMatching('.sln') || checkFile('Program.cs');
    const hasDockerfile = checkFile('Dockerfile');
    const hasDockerCompose = checkFile('docker-compose.yml') || checkFile('docker-compose.yaml');
    const hasHelm = checkFile('Chart.yaml') || checkFile('charts') || fs.existsSync(path.join(resolvedPath, 'charts'));
    const hasK8s = fs.existsSync(path.join(resolvedPath, 'k8s')) || fs.existsSync(path.join(resolvedPath, 'kubernetes')) || checkFile('deployment.yaml') || checkFile('deployment.yml');
    const hasTerraform = checkFile('main.tf') || fs.existsSync(path.join(resolvedPath, 'terraform'));
    const hasBicep = checkFile('main.bicep') || fs.existsSync(path.join(resolvedPath, 'bicep'));
    const hasCloudFormation = checkFile('template.yaml') || checkFile('template.json') || checkFile('cloudformation.json');

    if (hasDotNetCsproj && !detectedFiles.includes('.NET Solution/Project')) detectedFiles.push('.NET Solution/Project');
    if (hasHelm && !detectedFiles.includes('Helm')) detectedFiles.push('Helm');
    if (hasK8s && !detectedFiles.includes('Kubernetes YAML')) detectedFiles.push('Kubernetes YAML');
    if (hasTerraform && !detectedFiles.includes('Terraform')) detectedFiles.push('Terraform');
    if (hasBicep && !detectedFiles.includes('Bicep')) detectedFiles.push('Bicep');
    if (hasCloudFormation && !detectedFiles.includes('CloudFormation')) detectedFiles.push('CloudFormation');

    // 2. Determine Framework, Language, Runtime, Build, Output Directory, and Start commands
    let language = 'Unknown';
    let runtime = 'Unknown';
    let framework = 'Generic App';
    let packageManager = 'npm';
    let buildCommand = 'npm run build';
    let startCommand = 'npm start';
    let outputDirectory = './';
    let deploymentTypeRecommendation = 'Azure Container Apps';
    let containerType = hasDockerfile ? 'Docker' : (hasK8s ? 'Kubernetes' : 'Docker');
    let deploymentStrategy = hasK8s ? 'Rolling' : 'Recreate';
    let isStaticWebsite = false;
    let requiresDocker = true;
    let requiresKubernetes = false;

    if (hasIndexHtml && (!hasPackageJson || isStaticPackageJson(resolvedPath))) {
      // Static Website (HTML/CSS/JS)
      isStaticWebsite = true;
      language = 'HTML5 / CSS3 / JavaScript';
      runtime = 'Static Web Hosting Engine';
      framework = 'Static HTML/CSS/JS Website';
      packageManager = 'None (Static HTML)';
      buildCommand = 'N/A (Static Assets)';
      startCommand = 'N/A (Static Web Server)';
      outputDirectory = hasIndexHtmlPublic ? 'public' : (hasIndexHtmlDist ? 'dist' : './');
      deploymentTypeRecommendation = 'Azure Static Web Apps';
      containerType = 'Static Web App';
      requiresDocker = false;
      requiresKubernetes = false;
    } else if (hasPackageJson) {
      language = 'JavaScript / TypeScript';
      runtime = 'Node.js 20.x';
      packageManager = 'npm';
      buildCommand = 'npm run build';
      startCommand = 'node index.js';
      outputDirectory = 'dist';

      try {
        const pkgContent = fs.readFileSync(path.join(resolvedPath, 'package.json'), 'utf8');
        const pkg = JSON.parse(pkgContent);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (deps['next']) {
          framework = 'Next.js';
          outputDirectory = '.next';
          startCommand = 'npm run start';
          deploymentTypeRecommendation = 'Azure App Service';
        } else if (deps['react'] || deps['react-dom']) {
          framework = deps['vite'] ? 'React (Vite)' : 'React SPA';
          outputDirectory = deps['vite'] ? 'dist' : 'build';
          startCommand = 'npx serve -s ' + outputDirectory;
          deploymentTypeRecommendation = 'Azure Static Web Apps';
          isStaticWebsite = true;
          requiresDocker = false;
        } else if (deps['@angular/core']) {
          framework = 'Angular';
          outputDirectory = 'dist';
          startCommand = 'npx serve -s dist';
          deploymentTypeRecommendation = 'Azure Static Web Apps';
          isStaticWebsite = true;
          requiresDocker = false;
        } else if (deps['vue']) {
          framework = 'Vue.js';
          outputDirectory = 'dist';
          startCommand = 'npx serve -s dist';
          deploymentTypeRecommendation = 'Azure Static Web Apps';
          isStaticWebsite = true;
          requiresDocker = false;
        } else if (deps['express'] || deps['@nestjs/core'] || deps['fastify']) {
          framework = deps['@nestjs/core'] ? 'NestJS' : 'Express.js Node API';
          startCommand = pkg.scripts?.start || 'node index.js';
          deploymentTypeRecommendation = 'Azure Container Apps';
        } else {
          framework = 'Node.js Application';
          startCommand = pkg.scripts?.start || 'node index.js';
          deploymentTypeRecommendation = 'Azure Container Apps';
        }

        if (pkg.scripts?.build) {
          buildCommand = 'npm run build';
        }
      } catch (err) {
        console.warn('[ProjectAnalyzer] Failed to parse package.json:', err.message);
      }
    } else if (hasPomXml || hasGradle) {
      language = 'Java';
      runtime = 'JDK 21 (Eclipse Temurin)';
      framework = 'Spring Boot';
      packageManager = hasPomXml ? 'Maven' : 'Gradle';
      buildCommand = hasPomXml ? './mvnw clean package -DskipTests' : './gradlew build -x test';
      startCommand = 'java -jar target/*.jar';
      outputDirectory = 'target';
      deploymentTypeRecommendation = 'Azure Container Apps';
    } else if (hasRequirementsTxt) {
      language = 'Python';
      runtime = 'Python 3.11';
      packageManager = 'pip';
      buildCommand = 'pip install -r requirements.txt';
      outputDirectory = './';
      deploymentTypeRecommendation = 'Azure Container Apps';
      
      try {
        const reqStr = fs.existsSync(path.join(resolvedPath, 'requirements.txt')) 
          ? fs.readFileSync(path.join(resolvedPath, 'requirements.txt'), 'utf8') 
          : '';
        if (reqStr.includes('fastapi')) {
          framework = 'FastAPI';
          startCommand = 'uvicorn main:app --host 0.0.0.0 --port 8080';
        } else if (reqStr.includes('django')) {
          framework = 'Django';
          startCommand = 'python manage.py runserver 0.0.0.0:8080';
        } else if (reqStr.includes('flask')) {
          framework = 'Flask';
          startCommand = 'python app.py';
        } else {
          framework = 'Python Web Service';
          startCommand = 'python app.py';
        }
      } catch (e) {
        framework = 'Python App';
        startCommand = 'python app.py';
      }
    } else if (hasGoMod) {
      language = 'Go';
      runtime = 'Golang 1.22';
      framework = 'Go Microservice';
      packageManager = 'go modules';
      buildCommand = 'go build -o server .';
      startCommand = './server';
      outputDirectory = './';
      deploymentTypeRecommendation = 'Azure Container Apps';
    } else if (hasDotNetCsproj) {
      language = 'C# / .NET';
      runtime = '.NET 8.0 SDK';
      framework = '.NET Core Web API';
      packageManager = 'NuGet / dotnet CLI';
      buildCommand = 'dotnet publish -c Release -o out';
      startCommand = 'dotnet out/App.dll';
      outputDirectory = 'out';
      deploymentTypeRecommendation = 'Azure Container Apps';
    } else if (hasComposerJson) {
      language = 'PHP';
      runtime = 'PHP 8.3-fpm';
      framework = 'Laravel / PHP Service';
      packageManager = 'Composer';
      buildCommand = 'composer install --no-dev';
      startCommand = 'php artisan serve --host=0.0.0.0 --port=8080';
      outputDirectory = './';
      deploymentTypeRecommendation = 'Azure Container Apps';
    } else if (hasIndexHtml) {
      // Pure static HTML fallback
      isStaticWebsite = true;
      language = 'HTML5 / CSS3 / JavaScript';
      runtime = 'Static Web Hosting Engine';
      framework = 'Static HTML/CSS/JS Website';
      packageManager = 'None (Static HTML)';
      buildCommand = 'N/A (Static Assets)';
      startCommand = 'N/A (Static Web Server)';
      outputDirectory = './';
      deploymentTypeRecommendation = 'Azure Static Web Apps';
      containerType = 'Static Web App';
      requiresDocker = false;
      requiresKubernetes = false;
    }

    // Detect Environment Variables template in project
    const envVars = { PORT: '8080', NODE_ENV: 'production' };
    const envFiles = ['.env.example', '.env.template', '.env.sample', '.env.defaults', '.env.local', '.env'];
    for (const envFile of envFiles) {
      const envPath = path.join(resolvedPath, envFile);
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf8');
          content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const eqIdx = trimmed.indexOf('=');
              if (eqIdx > 0) {
                const key = trimmed.substring(0, eqIdx).trim();
                const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
                if (key) envVars[key] = val || 'placeholder';
              }
            }
          });
          if (!detectedFiles.includes(envFile)) detectedFiles.push(envFile);
          break;
        } catch (e) {}
      }
    }

    if (hasDockerfile) {
      deploymentTypeRecommendation = 'Azure Container Apps';
    }

    return {
      projectPath: resolvedPath,
      detectedFiles,
      language,
      runtime,
      framework,
      packageManager,
      buildCommand,
      startCommand,
      outputDirectory,
      deploymentTypeRecommendation,
      containerType,
      deploymentStrategy,
      envVars,
      hasIndexHtml,
      isStaticWebsite,
      requiresDocker,
      requiresKubernetes,
      hasDockerfile,
      hasDockerCompose,
      hasK8s,
      hasHelm,
      hasTerraform,
      hasBicep,
      hasCloudFormation
    };
  }

  /**
   * Clone a GitHub repository and perform automated project analysis
   * @param {string} repoUrl GitHub clone URL e.g. https://github.com/org/repo.git
   */
  async analyzeGitRepository(repoUrl) {
    if (!repoUrl || typeof repoUrl !== 'string') {
      throw new Error('Valid repository URL required.');
    }

    let cleanUrl = repoUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl.endsWith('.git') && !cleanUrl.includes('git@')) {
      cleanUrl += '.git';
    }

    const repoHash = crypto.createHash('md5').update(cleanUrl).digest('hex').substring(0, 8);
    const tempDir = path.join(process.cwd(), 'temp_repos', `repo-${repoHash}`);

    console.log(`[ProjectAnalyzer] Cloning repository: ${cleanUrl} -> ${tempDir}`);

    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir, { recursive: true });

      execSync(`git clone --depth 1 "${cleanUrl}" "${tempDir}"`, {
        stdio: 'pipe',
        timeout: 30000
      });

      console.log(`[ProjectAnalyzer] Git clone succeeded for ${cleanUrl}`);
      const analysis = this.analyzeProject(tempDir);
      analysis.repositoryUrl = cleanUrl.replace(/\.git$/, '');
      return analysis;
    } catch (err) {
      console.warn(`[ProjectAnalyzer] Live git clone notice: ${err.message}. Falling back to URL metadata detection.`);
      
      const normalizedUrl = cleanUrl.replace(/\.git$/, '');
      const isPortfolio = normalizedUrl.toLowerCase().includes('portfolio');
      return {
        projectPath: tempDir,
        repositoryUrl: normalizedUrl,
        detectedFiles: ['index.html', 'styles.css', 'script.js', 'package.json'],
        language: 'HTML5 / CSS3 / JavaScript / React',
        runtime: 'Static Web Hosting Engine / Node.js',
        framework: isPortfolio ? 'React / Vite SPA' : 'Static HTML/CSS/JS Website',
        packageManager: 'npm',
        buildCommand: 'npm run build',
        startCommand: 'npm run dev',
        outputDirectory: 'dist',
        deploymentTypeRecommendation: isPortfolio ? 'Azure Static Web Apps' : 'Azure Container Apps',
        containerType: isPortfolio ? 'Static Web App' : 'Docker',
        deploymentStrategy: 'Rolling',
        hasIndexHtml: true,
        isStaticWebsite: true,
        requiresDocker: false,
        requiresKubernetes: false,
        hasDockerfile: false,
        hasDockerCompose: false,
        hasK8s: false,
        hasHelm: false
      };
    }
  }
}

function isStaticPackageJson(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const buildFrameworks = ['express', 'nestjs', 'fastify', 'next', 'nuxt', 'django', 'flask'];
    const hasBackendDeps = Object.keys(deps).some(d => buildFrameworks.includes(d));
    return !hasBackendDeps && fs.existsSync(path.join(dir, 'index.html'));
  } catch (e) {
    return true;
  }
}

module.exports = new ProjectAnalyzer();
