# Enterprise Cloud Setup Guide

## Overview
This guide provides instructions for connecting **Microsoft Azure**, **Amazon Web Services (AWS)**, **Google Cloud Platform (GCP)**, **Docker**, and **Kubernetes** to the CloudOps platform.

---

## 1. Microsoft Azure Setup
1. Create an Azure Service Principal:
   ```bash
   az ad sp create-for-rbac --name "CloudOps-Deploy-SP" --role Contributor \
     --scopes /subscriptions/<YOUR_AZURE_SUBSCRIPTION_ID>
   ```
2. Note down: `appId` (Client ID), `password` (Client Secret), `tenant` (Tenant ID), and `subscriptionId`.
3. In CloudOps UI, navigate to **Cloud Accounts > Add Azure Subscription** and enter credentials.

---

## 2. Amazon Web Services (AWS) Setup
1. Create an IAM Role for CloudOps with cross-account trust policy.
2. Attach managed policies:
   - `AmazonECS_FullAccess`
   - `AmazonEKSClusterPolicy`
   - `AWSApplicationAutoscalingFullAccess`
   - `AWSCostExplorerReadOnlyAccess`
3. Enter `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in CloudOps UI.

---

## 3. Google Cloud Platform (GCP) Setup
1. Create a GCP Service Account:
   ```bash
   gcloud iam service-accounts create cloudops-deploy-sa \
     --description="CloudOps Deployer" --display-name="CloudOps-SA"
   ```
2. Grant roles: `roles/run.admin`, `roles/container.admin`, `roles/billing.viewer`.
3. Generate JSON Key:
   ```bash
   gcloud iam service-accounts keys create gcp-key.json \
     --iam-account=cloudops-deploy-sa@<YOUR_PROJECT_ID>.iam.gserviceaccount.com
   ```
4. Upload `gcp-key.json` in CloudOps UI under **Cloud Accounts > Add GCP Account**.

---

## 4. Local Docker & Kubernetes Setup
1. **Docker Engine**: Ensure Docker daemon is running locally (`docker info`).
2. **Kubernetes (kubectl)**: Verify access to your cluster:
   ```bash
   kubectl cluster-info
   kubectl get nodes
   ```
3. CloudOps will automatically read your local `~/.kube/config` context for Kubernetes cluster management.
