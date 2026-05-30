# LinkShrink — AWS EKS Deployment

Deploy the LinkShrink URL shortener on AWS EKS using RDS (PostgreSQL), ElastiCache (Redis), SQS (queue), and Secrets Manager. All resources deploy to the `default` namespace.

## Architecture

```
                  ┌─────────────────────┐
                  │    AWS ALB (public)  │
                  │ linkshrink.your.com  │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │      frontend        │
                  │    (nginx :80)       │
                  └──┬──────┬──────┬─────┘
                     │      │      │
       ┌─────────────┘      │      └──────────────┐
       ▼                    ▼                     ▼
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
│ auth-service │   │  url-service  │   │ analytics-service │
│    :3001     │   │    :3002      │   │     :3003         │
└──────┬───────┘   └──┬────┬──────┘   └───────┬──────────┘
       │              │    │                   │
       │    ┌─────────┘    │    ┌──────────────┘
       ▼    ▼              ▼    ▼
   ┌──────────┐  ┌──────────────┐
   │   RDS    │  │     SQS      │
   │PostgreSQL│  │visit-queue   │
   └──────────┘  └──────────────┘

 ┌───────────────┐  ┌──────────────┐
 │  ElastiCache  │  │  cleanup-    │
 │  (Redis)      │  │  worker:3004 │
 └───────────────┘  └──────────────┘

 Secrets Manager ─── Secrets Store CSI Driver ─── Pods
```

## Prerequisites

### 1. AWS Infrastructure (create before applying manifests)

| Resource | Purpose |
|----------|---------|
| **RDS PostgreSQL 16** | Database — note the endpoint |
| **ElastiCache Redis 7** | Cache & refresh tokens — note the endpoint |
| **SQS Queue** (`linkshrink-visit-queue`) | URL visit events — note the URL |
| **Secrets Manager** secret | Store JWT_SECRET, DB_USERNAME, DB_PASSWORD |
| **EKS Cluster** | 1.28+ with OIDC provider configured |
| **Route53 hosted zone** (optional) | For custom domain on the ALB |

### 2. EKS Add-ons

```bash
# Secrets Store CSI Driver
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system --set syncSecret.enabled=true

# ASCP (AWS Secrets Manager provider)
helm repo add aws-secrets-manager https://aws.github.io/secrets-store-csi-driver-provider-aws
helm install secrets-provider-aws aws-secrets-manager/secrets-store-csi-driver-provider-aws \
  --namespace kube-system

# AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=YOUR_CLUSTER_NAME \
  --set serviceAccount.create=true
```

### 3. IAM Roles (IRSA)

```bash
# CSI Driver needs access to Secrets Manager
eksctl create iamserviceaccount \
  --name csi-secrets-store \
  --namespace kube-system \
  --cluster YOUR_CLUSTER_NAME \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve

# URL Service — publish to SQS
eksctl create iamserviceaccount \
  --name url-service \
  --namespace default \
  --cluster YOUR_CLUSTER_NAME \
  --attach-policy-arn arn:aws:iam::ACCOUNT:policy/linkshrink-url-service-sqs \
  --approve

# Analytics Service — consume from SQS
eksctl create iamserviceaccount \
  --name analytics-service \
  --namespace default \
  --cluster YOUR_CLUSTER_NAME \
  --attach-policy-arn arn:aws:iam::ACCOUNT:policy/linkshrink-analytics-service-sqs \
  --approve

# Cleanup Worker
eksctl create iamserviceaccount \
  --name cleanup-worker \
  --namespace default \
  --cluster YOUR_CLUSTER_NAME \
  --attach-policy-arn arn:aws:iam::ACCOUNT:policy/linkshrink-cleanup-worker \
  --approve
```

### 4. AWS Secrets Manager — secret structure

Create a secret named `linkshrink/production` in Secrets Manager (key/value JSON):

```json
{
  "JWT_SECRET": "your-256-bit-random-secret",
  "DB_USERNAME": "postgres",
  "DB_PASSWORD": "YOUR_PASSWORD"
}
```

## Configuration — values you MUST change

| File | Key | What to set |
|------|-----|-------------|
| `02-configmap.yaml` | `DB_HOST` | Your RDS endpoint (no port, no protocol) |
| `02-configmap.yaml` | `REDIS_URL` | Your ElastiCache endpoint |
| `02-configmap.yaml` | `SQS_VISIT_QUEUE_URL` | Full SQS queue URL |
| `02-configmap.yaml` | `BASE_URL` | Your domain (e.g., `https://linkshrink.example.com`) |
| `02-configmap.yaml` | `AWS_REGION` | Your AWS region |
| `03-service-accounts.yaml` | All `role-arn` | Replace `ACCOUNT_ID` with your AWS account ID |
| `10-ingress.yaml` | `host` | Your domain |

## Deploy

```bash
# 1. Configure all placeholders above

# 2. Run the RDS init job (one-time)
kubectl apply -f aws-k8s/04-rds-init-job.yaml
kubectl wait --for=condition=complete job/rds-init --timeout=120s

# 3. Deploy everything else
kubectl apply -k aws-k8s/

# 4. Verify
kubectl get pods
kubectl get ingress
```

## Individual Manifests

| File | Resources |
|------|-----------|
| `01-secret-provider.yaml` | `SecretProviderClass` — syncs Secrets Manager → K8s Secret |
| `02-configmap.yaml` | `ConfigMap` — shared non-sensitive configuration |
| `03-service-accounts.yaml` | `ServiceAccount`s with IRSA for SQS access |
| `04-rds-init-job.yaml` | `ConfigMap` (init.sql) + `Job` — one-time DB schema init on RDS |
| `05-auth-service.yaml` | Auth Service `Deployment` + `Service` |
| `06-url-service.yaml` | URL Service `Deployment` + `Service` (with SQS IRSA) |
| `07-analytics-service.yaml` | Analytics Service `Deployment` + `Service` (with SQS IRSA) |
| `08-cleanup-worker.yaml` | Cleanup Worker `Deployment` + `Service` |
| `09-frontend.yaml` | Frontend `Deployment` + `Service` (NodePort for ALB) |
| `10-ingress.yaml` | ALB Ingress — public HTTP/S entry point |

## Application code changes needed

The existing services use `amqplib` (RabbitMQ). To work with SQS:

- **url-service**: Replace RabbitMQ publish with `@aws-sdk/client-sqs` `SendMessage`
- **analytics-service**: Replace RabbitMQ consume with SQS `ReceiveMessage` + `DeleteMessage` polling loop
- Both: Read `SQS_VISIT_QUEUE_URL` instead of `RABBITMQ_URL`

## Cleanup

```bash
kubectl delete -k aws-k8s/
# Also delete the SQS queues, RDS instance, ElastiCache cluster, and Secrets Manager secret if no longer needed
```
