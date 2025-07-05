# Pegasus EKS Deployment Guide

This guide provides step-by-step instructions for deploying the Pegasus EKS infrastructure platform.

## Prerequisites

Before deploying, ensure you have the following installed and configured:

### Required Tools
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [AWS CLI](https://aws.amazon.com/cli/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Required Accounts and Permissions
- AWS Account with appropriate permissions
- GitHub account with repository access
- GitHub Personal Access Token

## Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/number3ai/pegasus.git
cd pegasus/aws/eks
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
# AWS Configuration
export AWS_ACCESS_KEY_ID="your-aws-access-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
export AWS_REGION="us-east-1"

# GitHub Configuration
export GITHUB_TOKEN="your-github-token"
```

### 4. Configure Pulumi Stack
```bash
# Initialize Pulumi stack
pulumi stack init dev

# Set configuration values
pulumi config set aws:region us-east-1
pulumi config set github:token $GITHUB_TOKEN --secret
```

## Deployment Steps

### 1. Preview the Deployment
```bash
npm run preview
```

This will show you what resources will be created without actually creating them.

### 2. Deploy the Infrastructure
```bash
npm run up
```

This will create:
- VPC with public and private subnets
- EKS cluster with proper networking
- IAM roles and policies
- Route53 DNS zones
- SSL certificates
- ArgoCD for GitOps
- Monitoring stack (Grafana, Prometheus)
- Load balancer controller
- Storage drivers
- Secrets management

### 3. Verify the Deployment
```bash
# Get cluster credentials
aws eks update-kubeconfig --name dev --region us-east-1

# Verify cluster access
kubectl get nodes
kubectl get pods --all-namespaces
```

## Post-Deployment Configuration

### 1. Access ArgoCD Dashboard
- URL: `https://argocd.playground.com`
- Username: `admin`
- Password: Retrieve from AWS Secrets Manager

### 2. Access Grafana Dashboard
- URL: `https://grafana.playground.com`
- Username: `admin`
- Password: Retrieve from AWS Secrets Manager

### 3. Configure DNS
Update your domain's nameservers to point to the Route53 hosted zone.

## Management Commands

### View Stack Information
```bash
npm run stack
```

### Update Infrastructure
```bash
npm run up
```

### Destroy Infrastructure
```bash
npm run down
```

### Export Stack State
```bash
npm run export
```

### View Logs
```bash
npm run logs
```

## Troubleshooting

### Common Issues

#### 1. Pulumi Authentication Issues
```bash
# Re-authenticate with Pulumi
pulumi login
```

#### 2. AWS Credentials Issues
```bash
# Verify AWS credentials
aws sts get-caller-identity
```

#### 3. GitHub Token Issues
```bash
# Verify GitHub token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

#### 4. Cluster Access Issues
```bash
# Update kubeconfig
aws eks update-kubeconfig --name dev --region us-east-1

# Verify cluster access
kubectl cluster-info
```

### Getting Help

1. Check the [Pulumi documentation](https://www.pulumi.com/docs/)
2. Review AWS EKS best practices
3. Open an issue in this repository
4. Check the logs: `npm run logs`

## Security Considerations

### Network Security
- All worker nodes are in private subnets
- Public access is limited to necessary services
- SSL/TLS encryption is enabled for all external endpoints

### IAM Security
- Least privilege access is implemented
- IRSA (IAM Roles for Service Accounts) is used
- All resources are properly tagged

### Secrets Management
- Passwords are stored in AWS Secrets Manager
- External Secrets Operator manages Kubernetes secrets
- All sensitive data is encrypted

## Cost Optimization

### Resource Sizing
- Use appropriate instance types for your workload
- Enable auto-scaling with Karpenter
- Monitor resource usage with CloudWatch

### Cleanup
- Destroy unused resources: `npm run down`
- Monitor AWS billing dashboard
- Use AWS Cost Explorer for cost analysis

## Monitoring and Observability

### Available Dashboards
- **Grafana**: Application and infrastructure metrics
- **Prometheus**: Time-series metrics storage
- **CloudWatch**: AWS service metrics and logs

### Alerting
- Prometheus alerting rules are configured
- CloudWatch alarms for critical metrics
- ArgoCD health monitoring

## Backup and Recovery

### Data Backup
- EBS volumes are encrypted and backed up
- Configuration is stored in Git
- ArgoCD provides disaster recovery capabilities

### Recovery Procedures
1. Restore from Git repository
2. Recreate infrastructure with Pulumi
3. Restore data from backups
4. Verify application health

## Support

For additional support:
- Review the [README.md](../README.md)
- Check the [Pulumi documentation](https://www.pulumi.com/docs/)
- Open an issue in this repository 