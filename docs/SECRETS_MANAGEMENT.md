# Enterprise Secrets Management Guide

## Security Policy
In production environments, secrets must **NEVER** be committed to Git repositories or exposed in plain text `.env` files. CloudOps provides secret management integration with:
- **Azure Key Vault**
- **AWS Secrets Manager**
- **Google Secret Manager**

---

## 1. Azure Key Vault Integration
To link an Azure Key Vault secret to an application:
1. Ensure the Service Principal has `Key Vault Secrets User` role.
2. In CloudOps, specify secret references using URI format:
   `https://<VAULT_NAME>.vault.azure.net/secrets/<SECRET_NAME>/<VERSION>`

---

## 2. AWS Secrets Manager Integration
1. Store secret in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret --name prod/payment-api/db-password \
     --secret-string "supersecretpassword"
   ```
2. Specify ARN in CloudOps application environment configuration:
   `arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/payment-api/db-password`

---

## 3. Google Secret Manager Integration
1. Create secret in GCP Secret Manager:
   ```bash
   gcloud secrets create db-password --replication-policy="automatic"
   echo -n "supersecretpassword" | gcloud secrets versions add db-password --data-file=-
   ```
2. Reference secret in CloudOps:
   `projects/<PROJECT_ID>/secrets/db-password/versions/latest`

---

## Automatic Injection During Deployment
When a deployment is triggered:
1. CloudOps fetches secrets from the designated Secret Manager using tenant credentials.
2. Secrets are injected directly into the runtime container / pod environment variables securely in-memory.
3. Plaintext values are scrubbed from deployment logs and audit records.
