# Kubernetes deployment

This folder contains Kubernetes manifests for running the Insurance ERP app locally and for a production-style rollout.

## Local development with kind or minikube

1. Build local images:
   ```bash
   docker build -t insurance-erp-backend:latest ./back_end
   docker build -t insurance-erp-frontend:latest ./frontend
   ```

2. Create a local cluster (example with kind):
   ```bash
   kind create cluster --name insurance-erp
   ```

3. Apply the local overlay:
   ```bash
   kubectl apply -k k8s/overlays/local
   ```

4. Check rollout status:
   ```bash
   kubectl get pods -n insurance-erp
   kubectl get svc -n insurance-erp
   ```

5. Access via Ingress (Recommended) or Port-Forward:
   - **Using Ingress with Minikube:**
     ```bash
     minikube addons enable ingress
     minikube tunnel
     ```
   - **Using Ingress with Kind:**
     Ensure your Kind cluster was created with ingress port mappings (`extraPortMappings` for ports 80/443) and install the Nginx Ingress Controller:
     ```bash
     kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
     ```
   - **Direct Port-forward fallback:**
     ```bash
     kubectl port-forward -n insurance-erp svc/frontend 8080:80
     ```

   Open http://localhost (or http://localhost:8080 if using port-forward).

## Ingress Architecture & Routing
The cluster uses an Nginx Ingress resource routing edge traffic:
- `/` $\rightarrow$ `frontend` (React SPA)
- `/api/`, `/admin/`, `/static/`, `/media/` $\rightarrow$ `backend` (Django REST API)
- `/ws/` $\rightarrow$ `backend` (Daphne ASGI WebSockets)

## PostgreSQL Storage Persistence
PostgreSQL uses a `StatefulSet` with `volumeClaimTemplates` requesting 10Gi (`ReadWriteOnce`) dynamically provisioned by the cluster's default StorageClass. Database records persist across pod restarts and rescheduling.

## Production path

1. Replace the image names in [k8s/overlays/production/kustomization.yaml](k8s/overlays/production/kustomization.yaml) with your real registry images.
2. Update the domain name (`erp.example.com`) in [k8s/overlays/production/kustomization.yaml](k8s/overlays/production/kustomization.yaml) to your actual FQDN.
3. Ensure `cert-manager` is installed in your production cluster if using Let's Encrypt automated TLS certificates.
4. Update secrets in [k8s/base/secret.yaml](k8s/base/secret.yaml) with production-safe values.
5. Apply the production overlay:
   ```bash
   kubectl apply -k k8s/overlays/production
   ```

## Recommended production hardening

- Use a managed PostgreSQL service (e.g. AWS RDS, GCP Cloud SQL) instead of the in-cluster Postgres StatefulSet.
- Use an external Redis instance or a managed Redis service.
- Decouple Django migrations (`python manage.py migrate`) into a pre-deployment Kubernetes `Job`.
- Replace raw Kubernetes secrets with an external secret manager (e.g. HashiCorp Vault, AWS Secrets Manager via External Secrets Operator).
- Add resource requests/limits and Horizontal Pod Autoscalers (HPA).
