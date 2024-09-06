Day 1
----------
Introduction to Cloud
 - What is a cloud
 - Benifits of using a cloud
 - Competitor Clouds
 - Cloud Offering Mappings
 - AWS Service Offerings (Used in the Class)
    - iam
      - users
      - groups
      - irsa
      - oidc providers
    - compute
      - EC2
      - Fargate
      - Lambda
    - storage
      - RDS
      - S3
    - vault
      - SecretsManager
      - KMS
    - networking
      - load balancers
      - WAF
      - cloudfront
      - ACM
      - KMS
    - logs
      - cloudwatch
      - cloudtrail
 - AWS Console Primer
 - AWS CLI Primer
    - Setting up credentials
    - installing AWS CLI
    - configuring AWS CLI
 - AWS Security Best Practices
 - What is IMDS
 - Exercises:
     - Create AWS Account
     - Create (User) Service Account
     - Using AWS CLI with that User Account

Introduction to GitHub
 - What is GitHub
 - competitors
 - What is git
   - Repository
   - Branches
     - HEAD
   - Commits
   - Push
   - Pull Request
 - GitHub Actions
 - git cli
 - GitHub Security Best Practices
 - Exercises:
   - Create GitHub Organization
   - Create Hello World
   - Implement Security Best Practices
   - Create AWS action with Github Actions

Introduction to Kubernetes
  - What is Kubernetes
  - What is Docker
  - What is a container (image)
  - Other Orchestration Platforms
  - Deeper Dive into K8s
    - Kubernetes Manifest
    - Kustomize
    - Helm
    - KIND
      - Namespace
      - Deployment
      - DeamonSet
      - StatefulSet
      - ReplicaSet
      - Pod
      - Service
      - ServiceAccount
      - Secret
      - ConfigMap
      - RBAC
        - role
        - rolebinding
        - clusterrole
        - clusterrolebinding
      - CRDs
  - Service Mesh
  - Sidecarts
  - kubectl
  - Cloud Kubernetes
    - EKS
    - AKS
    - GKE
    - DOKS
  - Kubernetes Security Best Practices
  - Exercises:
    - Run your first container via Docker
    - Setup minikube/k3s/kind

Introduction to ArgoCD
  - What is CI/CD
  - What is Declarative Ops
  - What is GitOps
  - Competitors
  - What part(s) does ArgoCD Solve For
  - CRDs
    - ApplicationSet
    - App of Apps
  - ArgoCD Security Best Practices
  - Exercise
    - Setup minikube with ArgoCD
    - Using kubectl
    - Create GitOps with ArgoCD and GitHub

Extending AWS Tech Stack
  - Using IRSA
  - Common Addons
    - external dns
    - external secrets
    - aws load balancer controller
    - aws ebs csi driver
    - ingress-nginx
    - karpenter
    - prometheus
    - grafana

Practical #1: Setup Techstack
  - Setup EKS
  - Setup GitHub
  - Setup Kubectl with new cluster
  - Setup ArgoCD
  - Install HelloWorld
  - Browse to HelloWorld Web App

Day 2
----------
Introduction to IaC
 - What is IaC
 - Common IaC Languages
   - CDK
   - Terraform
   - Pulumi
 - Can't I just use Cloud API with my language?
 - Version Control
 - Exercises
    - Create EKS cluster with Terraform
    - Create EKS cluster with Pulumi

Practical #2: Setup DeclarativeOps Techstack via IaC
  - Recreate Practical #1 via IaC
  - Bonus: Setup GH Actions to handle CI/CD

Setting Up GitOps
  - Why separate infrastructure IaC from K8s IaC
  - Pros/Cons to GitOps
  - Environment Considerations
  - Version Control
  - GitOps Security Best Practices
  - How to get infra IaC to play nicely with k8s IaC

Practical #3: Setup GitOps Techstack via IaC
  - Continue with Practical #2
  - Setup GitHub Helm Repository
  - Setup Assymetric Key for ArgoCD to have Read access to Repository
  - Migrate HelloWorld to use app of apps
  - Bonus: Have ArgoCD manage ArgoCD

Day 3
----------
Adding Security to K8s
  - Container Security
  - Common Security Controls
     - Namespace
     - RBAC
     - ServiceMesh
     - IRSA
     - OPA
  - What is Envoy
  - Purpose of ServiceMesh
  - Common ServiceMeshes
    - Istio
    - Calico
    - Cilium
  - What is mTLS
  - Exercise

Practical #4: Setup Service Mesh via IaC
  - Setup Calico
  - Setup Istio
  - Create Network Policy to block IMDS
  - Migrate all resources out of Default namespace
  - Setup mTLS

Adding Observability to K8s
  - What is observability
  - What are traces
  - What are metrics
  - What are logs
  - Prometheus
  - Alert Manager
  - Grafana

Practical #5: Setup Observability via IaC
  - Setup Prometheus
  - Setup Thanos
  - Setup Loki
  - Setup Grafana
  - Setup EKS logging
    - dataplane
    - app logging
    - security
