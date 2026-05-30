# LinkShrink - Kubernetes Deployment

Deploy the entire LinkShrink URL shortener stack on a local Kubernetes cluster with ingress-nginx.

## Prerequisites

- Kubernetes cluster (Docker Desktop, Minikube, Kind, etc.)
- ingress-nginx installed
- `kubectl` configured

## Quick Start

```bash
# Add linkshrink.local to your hosts file
echo "127.0.0.1 linkshrink.local" | sudo tee -a /etc/hosts

# Deploy everything
kubectl apply -k k8s/

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n linkshrink --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n linkshrink --timeout=60s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n linkshrink --timeout=60s
kubectl wait --for=condition=ready pod -l app=auth-service -n linkshrink --timeout=60s
kubectl wait --for=condition=ready pod -l app=url-service -n linkshrink --timeout=60s
kubectl wait --for=condition=ready pod -l app=analytics-service -n linkshrink --timeout=60s
kubectl wait --for=condition=ready pod -l app=cleanup-worker -n linkshrink --timeout=60s
kubectl wait --for=condition=ready pod -l app=frontend -n linkshrink --timeout=60s
```

Then open **http://linkshrink.local** in your browser.

## Architecture

```
                    ┌──────────────┐
                    │  ingress-nginx │
                    │ linkshrink.local│
                    └──────┬───────┘
                           │ /
                   ┌───────▼───────┐
                   │   frontend    │
                   │ (nginx:80)    │
                   └───┬───┬───┬───┘
                       │   │   │
           ┌───────────┘   │   └───────────┐
           ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────────┐
    │auth-svc  │   │url-svc   │   │analytics-svc │
    │:3001     │   │:3002     │   │:3003         │
    └──────────┘   └──────────┘   └──────────────┘
                           ┌──────────┐
                           │cleanup   │
                           │:3004     │
                           └──────────┘

    postgres:5432    redis:6379    rabbitmq:5672
```

The frontend's built-in nginx proxies API requests to backend services using Kubernetes service DNS names within the cluster.

## Individual Manifests

| File | Resources |
|------|-----------|
| `00-namespace.yaml` | `linkshrink` namespace |
| `01-secret.yaml` | JWT secret, DB/RabbitMQ passwords |
| `02-configmap.yaml` | Shared configuration |
| `03-postgres-init-configmap.yaml` | Database init SQL |
| `04-postgres.yaml` | PostgreSQL StatefulSet, PVC, headless Service |
| `05-redis.yaml` | Redis Deployment + Service |
| `06-rabbitmq.yaml` | RabbitMQ Deployment + Service |
| `07-auth-service.yaml` | Auth Service Deployment + Service |
| `08-url-service.yaml` | URL Service Deployment + Service |
| `09-analytics-service.yaml` | Analytics Service Deployment + Service |
| `10-cleanup-worker.yaml` | Cleanup Worker Deployment + Service |
| `11-frontend.yaml` | Frontend (nginx) Deployment + Service |
| `12-ingress.yaml` | Ingress rule for linkshrink.local |

## Cleanup

```bash
kubectl delete namespace linkshrink
```
