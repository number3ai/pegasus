/**
 * Environment Configuration Variables
 * Centralized configuration for the Pegasus EKS infrastructure platform
 */

import { DEFAULTS, NETWORK, TAGS } from './constants';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export const ENVIRONMENT_CONFIG = {
  /** Current environment (dev, staging, prod) */
  ENVIRONMENT: 'dev',
  
  /** AWS Account ID */
  ACCOUNT_ID: '783634644742',
  
  /** AWS Region for all resources */
  REGION: 'us-east-1',
} as const;

// ============================================================================
// EKS CLUSTER CONFIGURATION
// ============================================================================

export const EKS_CONFIG = {
  /** EKS cluster name */
  CLUSTER_NAME: ENVIRONMENT_CONFIG.ENVIRONMENT,
  
  /** Kubernetes version for the EKS cluster */
  VERSION: '1.32',
  
  /** Root volume size for EKS nodes (GB) */
  NODE_ROOT_VOLUME_SIZE: DEFAULTS.VOLUME_SIZE_GB,
  
  /** CIDR blocks for public access to EKS API */
  PUBLIC_ACCESS_CIDRS: NETWORK.PUBLIC_ACCESS_CIDR,
  
  /** VPC CIDR block for the EKS cluster */
  VPC_CIDR_BLOCK: NETWORK.VPC_CIDR,
} as const;

// ============================================================================
// NODE GROUP CONFIGURATION
// ============================================================================

export const NODE_GROUP_CONFIG = {
  /** Minimum number of nodes in the node group */
  MIN_SIZE: DEFAULTS.NODE_MIN_SIZE,
  
  /** Maximum number of nodes in the node group */
  MAX_SIZE: DEFAULTS.NODE_MAX_SIZE,
  
  /** Desired number of nodes in the node group */
  DESIRED_SIZE: DEFAULTS.NODE_DESIRED_SIZE,
  
  /** EC2 instance type for the worker nodes */
  INSTANCE_TYPE: DEFAULTS.INSTANCE_TYPE,
} as const;

// ============================================================================
// DNS CONFIGURATION
// ============================================================================

export const DNS_CONFIG = {
  /** Public domain name for external services */
  PUBLIC_DOMAIN: 'playground.com',
  
  /** Private domain name for internal services */
  PRIVATE_DOMAIN: 'int.playground.com',
} as const;

// ============================================================================
// GITHUB CONFIGURATION
// ============================================================================

export const GITHUB_CONFIG = {
  /** GitHub organization or username */
  OWNER: 'number3ai',
  
  /** GitHub repository name */
  REPOSITORY: 'caprica',
  
  /** Path to bootloader charts in the repository */
  BOOTLOADER_PATH: 'charts/bootloader',
  
  /** List of bootloader configurations */
  BOOTLOADERS: ['infrastructure', 'security'] as const,
} as const;

// ============================================================================
// ARGOCD CONFIGURATION
// ============================================================================

export const ARGOCD_CONFIG = {
  /** ArgoCD Helm chart version */
  VERSION: '7.8.23',
  
  /** ArgoCD Apps Helm chart version */
  APPS_VERSION: '2.0.2',
} as const;

// ============================================================================
// TAGGING CONFIGURATION
// ============================================================================

export const TAGGING_CONFIG = {
  /** Default tags for all AWS resources */
  DEFAULT_TAGS: {
    Environment: ENVIRONMENT_CONFIG.ENVIRONMENT,
    ManagedBy: TAGS.MANAGED_BY,
    Project: TAGS.PROJECT,
    Component: TAGS.COMPONENT,
  },
  
  /** Service-specific tags */
  SERVICE_TAGS: {
    cluster: EKS_CONFIG.CLUSTER_NAME,
    environment: ENVIRONMENT_CONFIG.ENVIRONMENT,
  },
} as const;

// ============================================================================
// EXPORT ALL CONFIGURATIONS
// ============================================================================

export const {
  ENVIRONMENT,
  ACCOUNT_ID,
  REGION,
} = ENVIRONMENT_CONFIG;

export const {
  CLUSTER_NAME: eksClusterName,
  VERSION: eksVersion,
  NODE_ROOT_VOLUME_SIZE: eksNodeRootVolumeSize,
  PUBLIC_ACCESS_CIDRS: eksPublicAccess,
  VPC_CIDR_BLOCK: eksVPCCIDRBlock,
} = EKS_CONFIG;

export const {
  MIN_SIZE: minSize,
  MAX_SIZE: maxSize,
  DESIRED_SIZE: desiredSize,
  INSTANCE_TYPE: instanceType,
} = NODE_GROUP_CONFIG;

export const {
  PUBLIC_DOMAIN: dnsPublicDomain,
  PRIVATE_DOMAIN: dnsPrivateDomain,
} = DNS_CONFIG;

export const {
  OWNER: githubOwner,
  REPOSITORY: githubRepository,
  BOOTLOADER_PATH: githubBootloaderPath,
  BOOTLOADERS: githubBootloaders,
} = GITHUB_CONFIG;

export const {
  VERSION: argoCdVersion,
  APPS_VERSION: argoCdAppsVersion,
} = ARGOCD_CONFIG;

export const {
  DEFAULT_TAGS: tags,
} = TAGGING_CONFIG;

// ============================================================================
// COMPUTED VALUES
// ============================================================================

/** GitHub repository URL for SSH access */
export const githubRepositoryUrl = `git@github.com:${githubOwner}/${githubRepository}.git`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Environment = typeof ENVIRONMENT_CONFIG.ENVIRONMENT;
export type Region = typeof ENVIRONMENT_CONFIG.REGION;
export type ClusterName = typeof EKS_CONFIG.CLUSTER_NAME;
export type DomainName = typeof DNS_CONFIG.PUBLIC_DOMAIN | typeof DNS_CONFIG.PRIVATE_DOMAIN; 