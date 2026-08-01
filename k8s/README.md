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

5. Forward the frontend:
   ```bash
   kubectl port-forward -n insurance-erp svc/frontend 8080:80
   ```

Open http://localhost:8080.

## Production path

1. Replace the image names in [k8s/overlays/production/kustomization.yaml](k8s/overlays/production/kustomization.yaml) with your real registry images.
2. Update secrets in [k8s/base/secret.yaml](k8s/base/secret.yaml) with production-safe values.
3. Apply the production overlay:
   ```bash
   kubectl apply -k k8s/overlays/production
   ```

## Recommended production hardening

- Use a managed PostgreSQL service instead of the in-cluster Postgres StatefulSet.
- Use an external Redis instance or a managed Redis service.
- Add an Ingress controller and TLS certificates.
- Replace the default secret values and enable Secret management.
- Add resource requests/limits and autoscaling.
