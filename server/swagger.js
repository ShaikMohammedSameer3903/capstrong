/**
 * OpenAPI 3.0.0 Specification Generator for CloudOps Enterprise SaaS Platform
 */

function generateOpenApiSpec() {
  return {
    openapi: "3.0.0",
    info: {
      title: "CloudOps Multi-Cloud Application Platform API",
      version: "1.0.0",
      description: "Production-grade OpenAPI documentation for multi-cloud deployments, observability, governance, finops, and tenant security."
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local Backend Server"
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    paths: {
      "/health": {
        get: {
          summary: "Liveness & Health Probe",
          responses: {
            "200": { description: "Service is healthy and operational" }
          }
        }
      },
      "/live": {
        get: {
          summary: "Liveness Check",
          responses: {
            "200": { description: "Process is alive" }
          }
        }
      },
      "/ready": {
        get: {
          summary: "Readiness Check",
          responses: {
            "200": { description: "Database and core services are ready to handle traffic" }
          }
        }
      },
      "/metrics": {
        get: {
          summary: "Prometheus Metrics Endpoint",
          responses: {
            "200": { description: "Returns OpenTelemetry & Prometheus metric counters" }
          }
        }
      },
      "/api/projects/analyze": {
        post: {
          summary: "Auto Project Analyzer Engine",
          description: "Detects framework, language, runtime, build, container, and deployment strategy from project directory.",
          responses: {
            "200": { description: "Analysis completed successfully" },
            "400": { description: "Invalid project path" }
          }
        }
      },
      "/api/env/status": {
        get: {
          summary: "Environment Variables Diagnostics",
          responses: {
            "200": { description: "Environment configuration status" }
          }
        }
      },
      "/api/system/tools": {
        get: {
          summary: "Host System CLI Tools Diagnostics",
          responses: {
            "200": { description: "Status of 11 CLI tools (Docker, kubectl, az, aws, gcloud, etc.)" }
          }
        }
      },
      "/api/deployments/checklist": {
        post: {
          summary: "Pre-Deployment Verification Checklist",
          responses: {
            "200": { description: "Checklist verification results" }
          }
        }
      },
      "/api/deployments/deploy": {
        post: {
          summary: "Execute 14-Step Real Deployment Pipeline",
          responses: {
            "200": { description: "Deployment pipeline executed and persisted" },
            "500": { description: "Deployment failed" }
          }
        }
      }
    }
  };
}

module.exports = {
  generateOpenApiSpec
};
