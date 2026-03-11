# Pegasus - AWS EKS Infrastructure Platform

A comprehensive Infrastructure as Code (IaC) solution built with Pulumi for deploying and managing production-ready Amazon EKS clusters with enterprise-grade add-ons and observability.

## 🚀 Overview

Pegasus provides a complete AWS EKS infrastructure platform that includes:

- **EKS Cluster**: Production-ready Kubernetes cluster with proper networking and security
- **GitOps Workflow**: ArgoCD integration for continuous deployment
- **Observability Stack**: Grafana, Prometheus, and CloudWatch integration
- **Load Balancing**: AWS Load Balancer Controller with SSL termination
- **Auto-scaling**: Karpenter for intelligent node provisioning
- **Secrets Management**: External Secrets Operator for secure credential management
- **Storage**: EBS CSI Driver for persistent volumes
- **DNS Management**: Route53 integration with private and public zones

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pegasus Infrastructure                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   ArgoCD    │  │   Grafana   │  │  Prometheus │         │
│  │  (GitOps)   │  │(Monitoring) │  │ (Metrics)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Karpenter │  │ AWS Load    │  │ EBS CSI     │         │
│  │ (Auto-scaling)│ │ Balancer    │  │ Driver     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ External    │  │   Route53   │  │   EKS       │         │
│  │ Secrets     │  │   (DNS)     │  │  Cluster    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
aws/eks/
├── src/
│   ├── core/                    # Core infrastructure components
│   │   ├── cluster.ts          # EKS cluster configuration
│   │   ├── networking.ts       # VPC and networking setup
│   │   ├── iam.ts             # IAM roles and policies
│   │   └── dns.ts             # Route53 DNS configuration
│   ├── addons/                 # EKS add-ons and integrations
│   │   ├── argocd.ts          # GitOps workflow
│   │   ├── monitoring.ts      # Observability stack
│   │   ├── ingress.ts         # Load balancer configuration
│   │   ├── storage.ts         # Storage drivers
│   │   └── secrets.ts         # Secrets management
│   ├── providers/              # Cloud provider configurations
│   │   ├── aws.ts             # AWS provider setup
│   │   ├── github.ts          # GitHub provider setup
│   │   └── kubernetes.ts      # Kubernetes provider setup
│   ├── utils/                  # Utility functions and helpers
│   │   ├── irsa.ts            # IAM Roles for Service Accounts
│   │   ├── git.ts             # Git operations
│   │   └── yaml.ts            # YAML utilities
│   └── config/                 # Configuration management
│       ├── variables.ts       # Environment variables
│       └── constants.ts       # Application constants
├── package.json
├── tsconfig.json
└── Pulumi.yaml
```

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [AWS CLI](https://aws.amazon.com/cli/) configured
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Trivy](https://trivy.dev/) for security scanning
- GitHub Personal Access Token with repository access

## 🔒 Security & Quality

This project includes comprehensive security and quality assurance tools:

- **Security Scanning**: Trivy for vulnerability detection and npm audit for dependency security
- **Code Quality**: ESLint for linting and Prettier for formatting
- **Git Hooks**: Automated checks on commit and push
- **CI/CD**: GitHub Actions for continuous security and quality validation

See [SECURITY.md](aws/eks/SECURITY.md) for detailed information and [QUICKSTART.md](aws/eks/QUICKSTART.md) for getting started.

## 🔧 Configuration

### Environment Variables

```bash
export GITHUB_TOKEN="your-github-token"
export AWS_ACCESS_KEY_ID="your-aws-access-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
export AWS_REGION="us-east-1"
```

### Customization

Edit `src/config/variables.ts` to customize:

- AWS account and region settings
- EKS cluster configuration
- DNS domain names
- GitHub repository settings
- Environment-specific parameters

## 🚀 Deployment

1. **Install Dependencies**
   ```bash
   cd aws/eks
   npm install
   ```

2. **Initialize Pulumi**
   ```bash
   pulumi stack init dev
   ```

3. **Configure Stack**
   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set github:token $GITHUB_TOKEN --secret
   ```

4. **Deploy Infrastructure**
   ```bash
   pulumi up
   ```

5. **Access Your Cluster**
   ```bash
   pulumi stack output kubeconfig > kubeconfig.yaml
   export KUBECONFIG=kubeconfig.yaml
   kubectl get nodes
   ```

## 🔍 Monitoring and Access

### ArgoCD Dashboard
- URL: `https://argocd.playground.com`
- Username: `admin`
- Password: Retrieved from AWS Secrets Manager

### Grafana Dashboard
- URL: `https://grafana.playground.com`
- Username: `admin`
- Password: Retrieved from AWS Secrets Manager

### Cluster Access
```bash
# Get cluster credentials
aws eks update-kubeconfig --name dev --region us-east-1

# Verify access
kubectl get nodes
kubectl get pods --all-namespaces
```

## 🔧 Management

### Scaling
- **Karpenter**: Automatically scales nodes based on workload demands
- **Manual Scaling**: Modify node group configurations in `src/core/cluster.ts`

### Updates
- **ArgoCD**: Automatically syncs applications from Git
- **Infrastructure**: Run `pulumi up` to apply infrastructure changes

### Backup and Recovery
- **EBS Volumes**: Encrypted and backed up via AWS backup policies
- **Configuration**: Stored in Git with ArgoCD for disaster recovery

## 🛡️ Security Features

- **Network Security**: Private subnets with NAT gateways
- **IAM Security**: Least privilege access with IRSA
- **Encryption**: EBS volumes encrypted at rest
- **Secrets**: External Secrets Operator for secure credential management
- **TLS**: SSL certificates for all external endpoints

## 📊 Monitoring and Observability

- **Metrics**: Prometheus for cluster and application metrics
- **Logging**: CloudWatch for centralized logging
- **Dashboards**: Grafana for visualization
- **Alerts**: Prometheus alerting rules for proactive monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `pulumi preview`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [Pulumi documentation](https://www.pulumi.com/docs/)
2. Review AWS EKS best practices
3. Open an issue in this repository

## 🔄 Version History

- **v1.0.0**: Initial release with EKS cluster and core add-ons
- **v1.1.0**: Added monitoring stack and improved security
- **v1.2.0**: Enhanced GitOps workflow and auto-scaling
