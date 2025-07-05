/**
 * Application Constants
 * Centralized constants for the Pegasus EKS infrastructure platform
 */

// AWS Service Names
export const AWS_SERVICES = {
  EKS: 'eks',
  ECS: 'ecs',
  EC2: 'ec2',
  IAM: 'iam',
  ROUTE53: 'route53',
  SECRETS_MANAGER: 'secretsmanager',
  ACM: 'acm',
  CLOUDWATCH: 'cloudwatch',
} as const;

// Kubernetes Namespaces
export const K8S_NAMESPACES = {
  ARGOCD: 'argocd',
  MONITORING: 'monitoring',
  KUBE_SYSTEM: 'kube-system',
  EXTERNAL_SECRETS: 'external-secrets',
} as const;

// Helm Chart Repositories
export const HELM_REPOS = {
  ARGOCD: 'https://argoproj.github.io/argo-helm',
  PROMETHEUS_COMMUNITY: 'https://prometheus-community.github.io/helm-charts',
  GRAFANA: 'https://grafana.github.io/helm-charts',
} as const;

// Helm Chart Versions
export const HELM_VERSIONS = {
  ARGOCD: '7.8.23',
  ARGOCD_APPS: '2.0.2',
  PROMETHEUS: '25.8.0',
  GRAFANA: '7.0.0',
  KARPENTER: '0.34.0',
  EXTERNAL_SECRETS: '0.9.0',
  AWS_LOAD_BALANCER_CONTROLLER: '1.7.0',
  AWS_EBS_CSI_DRIVER: '2.28.0',
  INGRESS_NGINX: '4.8.0',
} as const;

// Resource Naming Patterns
export const NAMING_PATTERNS = {
  CLUSTER: '{environment}-cluster',
  VPC: '{environment}-vpc',
  ROLE: '{service}-sa',
  SECRET: '{clusterName}/{service}/credentials',
  NAMESPACE: '{environment}-{service}',
} as const;

// Default Values
export const DEFAULTS = {
  PASSWORD_LENGTH: 24,
  RECOVERY_WINDOW_DAYS: 0,
  VOLUME_SIZE_GB: 200,
  NODE_MIN_SIZE: 4,
  NODE_MAX_SIZE: 8,
  NODE_DESIRED_SIZE: 4,
  INSTANCE_TYPE: 't3.large',
} as const;

// Security Policies
export const SECURITY_POLICIES = {
  SSL_POLICY: 'ELBSecurityPolicy-FS-1-2-Res-2020-10',
  ENCRYPTION_ALGORITHM: 'AES256',
  KEY_ALGORITHM: 'ED25519',
} as const;

// Network Configuration
export const NETWORK = {
  VPC_CIDR: '10.100.0.0/16',
  PUBLIC_ACCESS_CIDR: ['0.0.0.0/0'],
  ENABLE_IPV6: false,
  ENABLE_DNS: true,
  ENABLE_METRICS: true,
} as const;

// Monitoring Configuration
export const MONITORING = {
  PROMETHEUS_RETENTION_DAYS: 15,
  GRAFANA_ADMIN_USER: 'admin',
  ALERT_CHECK_INTERVAL: '1m',
  SCRAPE_INTERVAL: '30s',
} as const;

// Git Configuration
export const GIT = {
  BRANCH: 'main',
  COMMIT_AUTHOR: 'Pulumi Bot',
  COMMIT_EMAIL: 'bot@pulumi.com',
  COMMIT_MESSAGE_PREFIX: 'Add new file to the repository:',
} as const;

// File Paths
export const PATHS = {
  RELEASES: 'releases/{environment}',
  BOOTLOADER: 'charts/bootloader',
  VALUES_FILE: '{fileName}.generated.yaml',
} as const;

// Tags
export const TAGS = {
  MANAGED_BY: 'Pulumi',
  PROJECT: 'Pegasus',
  COMPONENT: 'EKS',
} as const; 