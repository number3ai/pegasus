# Pegasus Demo Deployment

This is a demo deployment of the Pegasus EKS infrastructure module.

## Overview

This demo showcases how to use the Pegasus EKS infrastructure module to create a complete Kubernetes cluster with:

- EKS cluster with proper networking
- VPC with public and private subnets
- Route53 DNS zones (public and private)
- SSL certificates
- ArgoCD for GitOps
- Demo namespace for applications

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Pulumi CLI** installed
3. **AWS CLI** configured
4. **kubectl** installed

## Setup

### 1. Install Dependencies

```bash
cd deployments/demo
npm install
```

### 2. Configure Environment

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID="your-aws-access-key"
export AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
export AWS_REGION="us-east-1"
export GITHUB_TOKEN="your-github-token"

# Initialize Pulumi stack
pulumi stack init demo
```

### 3. Configure Pulumi

```bash
# Set configuration values
pulumi config set aws:region us-east-1
pulumi config set github:token $GITHUB_TOKEN --secret
```

## Deployment

### Preview the Deployment

```bash
npm run preview
```

### Deploy the Infrastructure

```bash
npm run up
```

This will create:
- EKS cluster named `demo-cluster`
- VPC with CIDR `10.100.0.0/16`
- Public domain: `demo.playground.com`
- Private domain: `int.demo.playground.com`
- ArgoCD for GitOps workflow
- Demo namespace for applications

### Verify the Deployment

```bash
# Get cluster credentials
aws eks update-kubeconfig --name demo-cluster --region us-east-1

# Verify cluster access
kubectl get nodes
kubectl get pods --all-namespaces
```

## Access Points

### ArgoCD Dashboard
- URL: `https://argocd.demo.playground.com`
- Username: `admin`
- Password: Retrieve from AWS Secrets Manager

### Demo Namespace
- Namespace: `demo`
- Purpose: For demo applications

## Management

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

### View Logs
```bash
npm run logs
```

## Configuration

The demo uses the following configuration:

```typescript
const demoConfig = {
  environment: "demo",
  accountId: "783634644742",
  region: "us-east-1",
  clusterName: "demo-cluster",
  kubernetesVersion: "1.32",
  vpcCidr: "10.100.0.0/16",
  publicDomain: "demo.playground.com",
  privateDomain: "int.demo.playground.com",
  nodeGroup: {
    minSize: 2,
    maxSize: 4,
    desiredSize: 2,
    instanceType: "t3.medium",
    rootVolumeSize: 100,
  },
  argocd: {
    enabled: true,
  },
};
```

## Customization

You can customize the demo by modifying the `demoConfig` object in `index.ts`:

- Change the cluster name
- Modify node group settings
- Update domain names
- Enable/disable ArgoCD
- Add custom tags

## Cleanup

To completely remove the demo infrastructure:

```bash
npm run down
pulumi stack rm demo
```

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure AWS credentials are properly configured
2. **GitHub Token**: Make sure the GitHub token has the necessary permissions
3. **DNS**: Update your domain's nameservers to point to the Route53 hosted zone
4. **Cluster Access**: Use `aws eks update-kubeconfig` to get cluster access

### Getting Help

- Check the [main README](../../README.md)
- Review the [module documentation](../../modules/eks/README.md)
- Open an issue in the repository

## Next Steps

After deploying the demo:

1. Deploy applications to the `demo` namespace
2. Configure ArgoCD applications
3. Set up monitoring and alerting
4. Implement CI/CD pipelines
5. Add security policies and compliance checks 