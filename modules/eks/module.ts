/**
 * Pegasus EKS Infrastructure Module Wrapper
 * Provides a clean interface to the existing EKS infrastructure
 */

import * as pulumi from "@pulumi/pulumi";

// Import the existing infrastructure
import {
  cluster,
  clusterExports,
  eksVpc,
  vpcExports,
  wildcardCertificate,
  dnsExports,
  deployArgoCD,
  createKubernetesProvider,
} from "./src";

// ============================================================================
// MODULE INTERFACE
// ============================================================================

/**
 * EKS Module Configuration Interface
 */
export interface EKSModuleConfig {
  /** Environment name (dev, staging, prod) */
  environment?: string;
  
  /** AWS Account ID */
  accountId: string;
  
  /** AWS Region for all resources */
  region?: string;
  
  /** EKS cluster name */
  clusterName?: string;
  
  /** Kubernetes version for the EKS cluster */
  kubernetesVersion?: string;
  
  /** VPC CIDR block */
  vpcCidr?: string;
  
  /** Public domain name for external services */
  publicDomain?: string;
  
  /** Private domain name for internal services */
  privateDomain?: string;
  
  /** GitHub configuration */
  github?: {
    owner: string;
    repository: string;
    bootloaderPath?: string;
    bootloaders?: string[];
  };
  
  /** Node group configuration */
  nodeGroup?: {
    minSize?: number;
    maxSize?: number;
    desiredSize?: number;
    instanceType?: string;
    rootVolumeSize?: number;
  };
  
  /** ArgoCD configuration */
  argocd?: {
    version?: string;
    appsVersion?: string;
    enabled?: boolean;
  };
  
  /** Tags for all resources */
  tags?: Record<string, string>;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  environment: 'dev',
  region: 'us-east-1',
  kubernetesVersion: '1.32',
  vpcCidr: '10.0.0.0/8',
  nodeGroup: {
    minSize: 3,
    maxSize: 10,
    desiredSize: 4,
    instanceType: 't3.medium',
    rootVolumeSize: 100,
  },
  argocd: {
    version: '7.8.23',
    enabled: true,
  },
} as const;

/**
 * EKS Module Output Interface
 */
export interface EKSModuleOutputs {
  /** Cluster information */
  cluster: {
    name: pulumi.Output<string>;
    arn: pulumi.Output<string>;
    endpoint: pulumi.Output<string>;
    version: pulumi.Output<string>;
    kubeconfig: pulumi.Output<string>;
    oidcIssuer: pulumi.Output<string>;
    oidcProviderArn: pulumi.Output<string>;
  };
  
  /** VPC information */
  vpc: {
    id: pulumi.Output<string>;
    privateSubnetIds: pulumi.Output<string[]>;
    publicSubnetIds: pulumi.Output<string[]>;
  };
  
  /** DNS information */
  dns: {
    privateZoneId: pulumi.Output<string>;
    publicZoneId: pulumi.Output<string>;
    wildcardCertificateArn: pulumi.Output<string>;
  };
  
  /** ArgoCD information */
  argocd?: {
    release: any;
    deployKey: any;
    adminPassword: any;
  };
}

/**
 * EKS Infrastructure Module
 * Creates a complete EKS infrastructure with all necessary components
 */
export class EKSModule extends pulumi.ComponentResource {
  public readonly outputs: EKSModuleOutputs;

  constructor(
    name: string,
    config: EKSModuleConfig,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("pegasus:eks:EKSModule", name, config, opts);

    // Merge user config with defaults
    const mergedConfig = this.mergeConfigWithDefaults(config);

    // Create Kubernetes provider
    const k8sProvider = createKubernetesProvider(cluster);

    // Deploy ArgoCD if enabled
    let argocdOutputs: any = undefined;
    if (mergedConfig.argocd?.enabled !== false) {
      argocdOutputs = deployArgoCD(k8sProvider);
    }

    // Set outputs
    this.outputs = {
      cluster: {
        name: clusterExports.clusterName,
        arn: clusterExports.clusterArn,
        endpoint: clusterExports.clusterEndpoint,
        version: clusterExports.clusterVersion,
        kubeconfig: clusterExports.kubeconfig,
        oidcIssuer: clusterExports.oidcIssuer,
        oidcProviderArn: clusterExports.oidcProviderArn,
      },
      vpc: {
        id: vpcExports.vpcId,
        privateSubnetIds: vpcExports.privateSubnetIds,
        publicSubnetIds: vpcExports.publicSubnetIds,
      },
      dns: {
        privateZoneId: dnsExports.privateZoneId,
        publicZoneId: dnsExports.publicZoneId,
        wildcardCertificateArn: dnsExports.wildcardCertificateArn,
      },
      argocd: argocdOutputs,
    };

    // Register outputs
    this.registerOutputs({
      cluster: this.outputs.cluster,
      vpc: this.outputs.vpc,
      dns: this.outputs.dns,
      argocd: this.outputs.argocd,
    });
  }

  /**
   * Merge user configuration with defaults
   */
  private mergeConfigWithDefaults(userConfig: EKSModuleConfig): EKSModuleConfig {
    // Get the parent folder name for cluster name derivation
    const parentFolderName = this.getParentFolderName();
    
    // Determine environment and cluster name
    const environment = userConfig.environment || DEFAULT_CONFIG.environment;
    const clusterName = userConfig.clusterName || `${parentFolderName}-cluster`;
    
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      environment,
      clusterName,
      nodeGroup: {
        ...DEFAULT_CONFIG.nodeGroup,
        ...userConfig.nodeGroup,
      },
      argocd: {
        ...DEFAULT_CONFIG.argocd,
        ...userConfig.argocd,
      },
    };
  }

  /**
   * Get the parent folder name from the current working directory
   */
  private getParentFolderName(): string {
    try {
      const path = require('path');
      const process = require('process');
      const cwd = process.cwd();
      const parentFolder = path.basename(path.dirname(cwd));
      return parentFolder;
    } catch (error) {
      // Fallback to 'dev' if we can't determine the folder name
      return 'dev';
    }
  }

  /**
   * Get cluster information for external use
   */
  public getClusterInfo() {
    return {
      name: this.outputs.cluster.name,
      version: this.outputs.cluster.version,
      endpoint: this.outputs.cluster.endpoint,
      region: "us-east-1", // This should come from config
      vpcId: this.outputs.vpc.id,
      privateSubnets: this.outputs.vpc.privateSubnetIds,
      publicSubnets: this.outputs.vpc.publicSubnetIds,
    };
  }

  /**
   * Get add-on information
   */
  public getAddonInfo() {
    return {
      argocd: this.outputs.argocd,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a simple EKS cluster with minimal configuration
 */
export function createSimpleEKS(
  name: string,
  environment?: string,
  opts?: pulumi.ComponentResourceOptions
): EKSModule {
  return new EKSModule(name, {
    environment,
    accountId: "783634644742", // Default account ID
    // Uses module defaults for region, kubernetesVersion, vpcCidr, nodeGroup, argocd, clusterName
  }, opts);
}

/**
 * Create a production EKS cluster with all features enabled
 */
export function createProductionEKS(
  name: string,
  config: Partial<EKSModuleConfig> = {},
  opts?: pulumi.ComponentResourceOptions
): EKSModule {
  return new EKSModule(name, {
    accountId: "783634644742",
    // Uses module defaults for region, kubernetesVersion, vpcCidr, nodeGroup, argocd, clusterName, environment
    publicDomain: "playground.com",
    privateDomain: "int.playground.com",
    github: {
      owner: "number3ai",
      repository: "caprica",
      bootloaderPath: "charts/bootloader",
      bootloaders: ["infrastructure", "security"],
    },
    tags: {
      Environment: "dev", // Will be overridden by config if provided
      ManagedBy: "Pulumi",
      Project: "Pegasus",
      Component: "EKS",
    },
    ...config,
  }, opts);
} 