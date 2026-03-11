# Pegasus EKS Infrastructure Module

A reusable Pulumi module for creating production-ready AWS EKS infrastructure with enterprise-grade add-ons and observability.

## Overview

This module provides a complete EKS infrastructure solution including:

- **EKS Cluster**: Production-ready Kubernetes cluster with proper networking
- **VPC & Networking**: VPC with public and private subnets, NAT gateways
- **IAM & Security**: IAM roles, policies, and IRSA (IAM Roles for Service Accounts)
- **DNS & SSL**: Route53 zones and SSL certificates
- **GitOps**: ArgoCD for continuous deployment
- **Monitoring**: Grafana, Prometheus, and CloudWatch integration
- **Load Balancing**: AWS Load Balancer Controller
- **Storage**: EBS CSI Driver for persistent volumes
- **Secrets Management**: External Secrets Operator
- **Auto-scaling**: Karpenter for node auto-scaling

## Quick Start

### Basic Usage

```typescript
import * as eksModule from "../../modules/eks";

// Create EKS infrastructure
const eks = new eksModule.EKSModule("my-eks", {
  environment: "production",
  accountId: "123456789012",
  region: "us-east-1",
});
```

### Advanced Configuration

```typescript
import * as eksModule from "../../modules/eks";

const eks = new eksModule.EKSModule("production-eks", {
  environment: "production",
  accountId: "123456789012",
  region: "us-east-1",
  clusterName: "prod-cluster",
  kubernetesVersion: "1.32",
  vpcCidr: "10.100.0.0/16",
  publicDomain: "example.com",
  privateDomain: "int.example.com",
  github: {
    owner: "myorg",
    repository: "myrepo",
    bootloaderPath: "charts/bootloader",
    bootloaders: ["infrastructure", "security"],
  },
  nodeGroup: {
    minSize: 4,
    maxSize: 8,
    desiredSize: 4,
    instanceType: "t3.large",
    rootVolumeSize: 200,
  },
  argocd: {
    version: "7.8.23",
    appsVersion: "2.0.2",
    enabled: true,
  },
  tags: {
    Environment: "production",
    Project: "myproject",
    Owner: "devops-team",
  },
});
```

## Configuration

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `environment` | string | Environment name (dev, staging, prod) |
| `accountId` | string | AWS Account ID |
| `region` | string | AWS Region for all resources |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `clusterName` | string | `environment` | EKS cluster name |
| `kubernetesVersion` | string | `"1.32"` | Kubernetes version |
| `vpcCidr` | string | `"10.100.0.0/16"` | VPC CIDR block |
| `publicDomain` | string | `"playground.com"` | Public domain name |
| `privateDomain` | string | `"int.playground.com"` | Private domain name |
| `github.owner` | string | `"number3ai"` | GitHub organization |
| `github.repository` | string | `"caprica"` | GitHub repository |
| `github.bootloaderPath` | string | `"charts/bootloader"` | Path to bootloader charts |
| `github.bootloaders` | string[] | `["infrastructure", "security"]` | Bootloader configurations |
| `nodeGroup.minSize` | number | `4` | Minimum nodes |
| `nodeGroup.maxSize` | number | `8` | Maximum nodes |
| `nodeGroup.desiredSize` | number | `4` | Desired nodes |
| `nodeGroup.instanceType` | string | `"t3.large"` | EC2 instance type |
| `nodeGroup.rootVolumeSize` | number | `200` | Root volume size (GB) |
| `argocd.version` | string | `"7.8.23"` | ArgoCD version |
| `argocd.appsVersion` | string | `"2.0.2"` | ArgoCD Apps version |
| `argocd.enabled` | boolean | `true` | Enable ArgoCD |
| `tags` | object | `{}` | Additional tags |

## Outputs

The module provides the following outputs:

### Cluster Information
- `cluster.name`: EKS cluster name
- `cluster.arn`: EKS cluster ARN
- `cluster.endpoint`: EKS cluster endpoint
- `cluster.version`: Kubernetes version
- `cluster.kubeconfig`: Kubeconfig for cluster access
- `cluster.oidcIssuer`: OIDC issuer URL
- `cluster.oidcProviderArn`: OIDC provider ARN

### VPC Information
- `vpc.id`: VPC ID
- `vpc.privateSubnetIds`: Private subnet IDs
- `vpc.publicSubnetIds`: Public subnet IDs

### DNS Information
- `dns.privateZoneId`: Private Route53 zone ID
- `dns.publicZoneId`: Public Route53 zone ID
- `dns.wildcardCertificateArn`: Wildcard SSL certificate ARN

### ArgoCD Information
- `argocd.release`: ArgoCD Helm release
- `argocd.deployKey`: ArgoCD deploy key
- `argocd.adminPassword`: ArgoCD admin password

## Examples

### Development Environment

```typescript
import * as eksModule from "../../modules/eks";

const devEks = new eksModule.EKSModule("dev-eks", {
  environment: "dev",
  accountId: "123456789012",
  region: "us-east-1",
  nodeGroup: {
    minSize: 2,
    maxSize: 4,
    desiredSize: 2,
    instanceType: "t3.medium",
  },
  argocd: {
    enabled: false, // Disable ArgoCD for dev
  },
});
```

### Production Environment

```typescript
import * as eksModule from "../../modules/eks";

const prodEks = new eksModule.EKSModule("prod-eks", {
  environment: "production",
  accountId: "123456789012",
  region: "us-east-1",
  nodeGroup: {
    minSize: 4,
    maxSize: 12,
    desiredSize: 6,
    instanceType: "t3.xlarge",
    rootVolumeSize: 500,
  },
  argocd: {
    enabled: true,
  },
  tags: {
    Environment: "production",
    Project: "myproject",
    Owner: "devops-team",
    CostCenter: "engineering",
  },
});
```

## Security Features

- **Network Security**: Private subnets for worker nodes
- **IAM Security**: Least privilege access with IRSA
- **Encryption**: EBS volumes encrypted at rest
- **Secrets Management**: AWS Secrets Manager integration
- **SSL/TLS**: Wildcard certificates for internal services
- **Access Control**: OIDC provider for service accounts

## Monitoring & Observability

- **Grafana**: Application and infrastructure dashboards
- **Prometheus**: Time-series metrics storage
- **CloudWatch**: AWS service metrics and logs
- **ArgoCD**: Application deployment monitoring
- **Alerting**: Prometheus alerting rules

## Best Practices

1. **Environment Separation**: Use different configurations for dev/staging/prod
2. **Resource Tagging**: Tag all resources for cost tracking and management
3. **Security Groups**: Follow least privilege principle
4. **Backup Strategy**: Implement regular backups of critical data
5. **Monitoring**: Set up comprehensive monitoring and alerting
6. **Documentation**: Document customizations and configurations

## Troubleshooting

### Common Issues

1. **VPC Limits**: Ensure you have sufficient VPC limits in your AWS account
2. **IAM Permissions**: Verify AWS credentials have necessary permissions
3. **GitHub Access**: Ensure GitHub token has repository access
4. **DNS Configuration**: Update domain nameservers to Route53

### Getting Help

- Check the [main README](../../README.md)
- Review the [demo deployment](../../deployments/demo/README.md)
- Open an issue in the repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see the [LICENSE](../../LICENSE) file for details. 