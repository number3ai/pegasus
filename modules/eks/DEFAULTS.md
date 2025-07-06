# EKS Module Defaults

This document outlines the default configuration values for the Pegasus EKS module.

## Default Configuration Values

The EKS module now includes sensible defaults for all major configuration options. Users can override any of these defaults by providing their own values in the configuration.

### Core Infrastructure Defaults

| Configuration | Default Value | Description |
|---------------|---------------|-------------|
| `environment` | `dev` | Environment name (dev, staging, prod) |
| `region` | `us-east-1` | AWS region for all resources |
| `kubernetesVersion` | `1.32` | Kubernetes version for the EKS cluster |
| `vpcCidr` | `10.0.0.0/8` | VPC CIDR block |
| `clusterName` | `{parent-folder}-cluster` | EKS cluster name (derived from parent folder) |

### Node Group Defaults

| Configuration | Default Value | Description |
|---------------|---------------|-------------|
| `nodeGroup.minSize` | `3` | Minimum number of nodes |
| `nodeGroup.maxSize` | `10` | Maximum number of nodes |
| `nodeGroup.desiredSize` | `4` | Desired number of nodes |
| `nodeGroup.instanceType` | `t3.medium` | EC2 instance type |
| `nodeGroup.rootVolumeSize` | `100` | Root volume size in GB |

### ArgoCD Defaults

| Configuration | Default Value | Description |
|---------------|---------------|-------------|
| `argocd.version` | `7.8.23` | ArgoCD Helm chart version |
| `argocd.enabled` | `true` | Whether ArgoCD is enabled |

## Usage Examples

### Minimal Configuration
```typescript
const eks = new EKSModule("my-cluster", {
  accountId: "123456789012",
  // All other values use defaults:
  // - environment: "dev"
  // - clusterName: "my-cluster" (derived from parent folder)
  // - region: "us-east-1"
  // - kubernetesVersion: "1.32"
  // - vpcCidr: "10.0.0.0/8"
  // - nodeGroup: { minSize: 3, maxSize: 10, desiredSize: 4, instanceType: "t3.medium", rootVolumeSize: 100 }
  // - argocd: { version: "7.8.23", enabled: true }
});
```

### Override Specific Defaults
```typescript
const eks = new EKSModule("my-cluster", {
  environment: "prod", // Override default "dev"
  accountId: "123456789012",
  region: "us-west-2", // Override default region
  clusterName: "custom-cluster", // Override auto-generated name
  nodeGroup: {
    minSize: 5, // Override default min size
    maxSize: 15, // Override default max size
  },
  // Other values use defaults
});
```

### Utility Functions
The module provides utility functions that use these defaults:

- `createSimpleEKS()` - Creates a cluster with minimal configuration
- `createProductionEKS()` - Creates a production-ready cluster

## Configuration Merging

The module automatically merges user-provided configuration with defaults using a deep merge strategy:

1. Top-level defaults are applied first
2. User configuration overrides defaults
3. Nested objects (like `nodeGroup` and `argocd`) are merged recursively
4. User values take precedence over defaults

This ensures that users only need to specify the values they want to customize, while getting sensible defaults for everything else. 