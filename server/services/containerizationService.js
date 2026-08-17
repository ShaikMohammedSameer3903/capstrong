const fs = require('fs');
const path = require('path');

class ContainerizationService {
  /**
   * Detect containerization artifacts in an application repository path
   */
  detectArtifacts(repoPath) {
    const hasDockerfile = fs.existsSync(path.join(repoPath, 'Dockerfile'));
    const hasDockerCompose = fs.existsSync(path.join(repoPath, 'docker-compose.yml')) || fs.existsSync(path.join(repoPath, 'docker-compose.yaml'));
    const hasK8sManifests = fs.existsSync(path.join(repoPath, 'k8s')) || fs.existsSync(path.join(repoPath, 'kubernetes'));
    const hasHelmChart = fs.existsSync(path.join(repoPath, 'Chart.yaml')) || fs.existsSync(path.join(repoPath, 'charts'));

    return {
      hasDockerfile,
      hasDockerCompose,
      hasK8sManifests,
      hasHelmChart
    };
  }

  /**
   * Generate production-ready Dockerfile based on application runtime
   */
  generateDockerfile(appName, runtime = 'node', port = 8080) {
    const r = runtime.toLowerCase();
    const cleanName = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (r.includes('react') || r.includes('vite') || r.includes('frontend') || r.includes('static')) {
      return `# Production Dockerfile for ${appName} (React / Nginx Multi-stage)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
    } else if (r.includes('python')) {
      return `# Production Dockerfile for ${appName} (Python)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${port}
CMD ["python", "app.py"]
`;
    } else if (r.includes('go') || r.includes('golang')) {
      return `# Production Dockerfile for ${appName} (Golang Multi-stage)
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE ${port}
CMD ["./server"]
`;
    } else if (r.includes('java') || r.includes('spring')) {
      return `# Production Dockerfile for ${appName} (Java / Spring Boot)
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE ${port}
ENTRYPOINT ["java", "-jar", "app.jar"]
`;
    } else if (r.includes('net') || r.includes('csharp')) {
      return `# Production Dockerfile for ${appName} (.NET Core)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE ${port}
ENTRYPOINT ["dotnet", "${cleanName}.dll"]
`;
    } else if (r.includes('php')) {
      return `# Production Dockerfile for ${appName} (PHP / Apache)
FROM php:8.3-apache
WORKDIR /var/www/html
COPY . .
RUN docker-php-ext-install pdo pdo_mysql
EXPOSE 80
`;
    } else {
      return `# Production Dockerfile for ${appName} (Node.js)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE ${port}
ENV NODE_ENV=production
CMD ["node", "index.js"]
`;
    }
  }

  /**
   * Generate production docker-compose.yml
   */
  generateDockerCompose(appName, port = 8080) {
    const cleanName = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `version: '3.8'

services:
  ${cleanName}-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
      - BACKEND_URL=http://${cleanName}-backend:3001
    depends_on:
      - ${cleanName}-backend

  ${cleanName}-backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "${port}:3001"
    environment:
      - PORT=3001
      - DATABASE_URL=postgresql://cloudops:cloudops_secret@postgres:5432/cloudops_db
      - REDIS_URL=redis://redis:6379
      - PROMETHEUS_URL=http://prometheus:9090
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cloudops
      POSTGRES_PASSWORD: cloudops_secret
      POSTGRES_DB: cloudops_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  prometheus:
    image: prom/prometheus:v2.49.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:10.2.3
    ports:
      - "3000:3000"
    depends_on:
      - prometheus

  jaeger:
    image: jaegertracing/all-in-one:1.53
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"

volumes:
  postgres_data:
`;
  }

  /**
   * Generate complete set of Kubernetes Manifests
   */
  generateK8sManifests(appName, containerImage, port = 8080, replicas = 3, cloudProvider = 'azure') {
    const name = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const ingressClass = cloudProvider === 'azure' ? 'addon-http-application-routing' : (cloudProvider === 'aws' ? 'alb' : 'gce');

    return {
      namespace: `apiVersion: v1
kind: Namespace
metadata:
  name: ${name}-ns
  labels:
    environment: production
    managed-by: cloudops-platform
`,
      configMap: `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}-config
  namespace: ${name}-ns
data:
  PORT: "${port}"
  NODE_ENV: "production"
  LOG_LEVEL: "info"
`,
      secret: `apiVersion: v1
kind: Secret
metadata:
  name: ${name}-secret
  namespace: ${name}-ns
type: Opaque
stringData:
  DB_PASSWORD: "cloudops-secure-db-password-2026"
  JWT_SECRET: "cloudops-enterprise-jwt-super-secret-key-2026"
`,
      pv: `apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${name}-pv
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: "/mnt/data/${name}"
`,
      pvc: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}-pvc
  namespace: ${name}-ns
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
`,
      deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${name}-ns
  labels:
    app: ${name}
    cloud: ${cloudProvider}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
    spec:
      containers:
      - name: ${name}
        image: ${containerImage}
        ports:
        - containerPort: ${port}
        envFrom:
        - configMapRef:
            name: ${name}-config
        - secretRef:
            name: ${name}-secret
        resources:
          requests:
            cpu: "250m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1024Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 15
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 5
          periodSeconds: 5
`,
      service: `apiVersion: v1
kind: Service
metadata:
  name: ${name}-svc
  namespace: ${name}-ns
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: ${port}
    protocol: TCP
  selector:
    app: ${name}
`,
      ingress: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}-ingress
  namespace: ${name}-ns
  annotations:
    kubernetes.io/ingress.class: "${ingressClass}"
spec:
  rules:
  - host: ${name}.cloudops.internal
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${name}-svc
            port:
              number: 80
`,
      hpa: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}-hpa
  namespace: ${name}-ns
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${name}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
`,
      networkPolicy: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${name}-network-policy
  namespace: ${name}-ns
spec:
  podSelector:
    matchLabels:
      app: ${name}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ${name}
    ports:
    - protocol: TCP
      port: ${port}
`
    };
  }

  /**
   * Generate complete Helm Chart
   */
  generateHelmChart(appName, version = '1.0.0') {
    const name = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return {
      chartYaml: `apiVersion: v2
name: ${name}
description: Helm chart for ${appName} on CloudOps Multi-Cloud Platform
type: application
version: ${version}
appVersion: "${version}"
`,
      valuesYaml: `replicaCount: 3
image:
  repository: cloudops-registry.internal/${name}
  pullPolicy: IfNotPresent
  tag: "${version}"

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 1000m
    memory: 1024Mi
  requests:
    cpu: 250m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 75
`,
      templatesDeploymentYaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${name}.fullname" . }}
  labels:
    {{- include "${name}.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "${name}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${name}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
`
    };
  }
}

module.exports = new ContainerizationService();
