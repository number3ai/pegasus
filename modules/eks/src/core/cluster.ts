/**
 * EKS Cluster Infrastructure
 * Amazon EKS cluster configuration for the Pegasus infrastructure
 */

import * as eks from "@pulumi/eks";

import { eksVpc } from "./networking";
import { instanceRoles } from "./iam";
import {
  eksClusterName,
  eksNodeRootVolumeSize,
  eksPublicAccess,
  eksVersion,
  tags,
} from "../config/variables";
import { DEFAULTS } from "../config/constants";

/**
 * EKS Cluster Configuration
 * Creates a production-ready EKS cluster with proper networking and security
 */
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`, {
  // Auto-scaling configuration
  autoMode: {
    enabled: true,
  },
  
  // OIDC provider for IRSA
  createOidcProvider: true,
  
  // Cluster logging configuration
  enabledClusterLogTypes: [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler",
  ],
  
  // Network access configuration
  endpointPublicAccess: true,
  endpointPrivateAccess: true,
  publicAccessCidrs: eksPublicAccess,
  
  // Node configuration
  instanceRoles: instanceRoles,
  name: eksClusterName,
  nodeAssociatePublicIpAddress: false,
  nodeRootVolumeEncrypted: true,
  nodeRootVolumeSize: eksNodeRootVolumeSize,
  
  // Subnet configuration
  privateSubnetIds: eksVpc.privateSubnetIds,
  publicSubnetIds: eksVpc.publicSubnetIds,
  
  // Skip default node group (we'll use Karpenter)
  skipDefaultNodeGroup: true,
  
  // Storage classes configuration
  storageClasses: {
    gp2: {
      allowVolumeExpansion: true,
      default: true,
      encrypted: true,
      reclaimPolicy: "Delete",
      type: "gp2",
      volumeBindingMode: "Immediate",
    },
    gp3: {
      allowVolumeExpansion: true,
      default: false,
      encrypted: true,
      reclaimPolicy: "Delete",
      type: "gp3",
      volumeBindingMode: "Immediate",
      parameters: {
        iops: "3000",
        throughput: "125",
      },
    },
  },
  
  // Tags and version
  tags: {
    ...tags,
    Name: `${eksClusterName}-cluster`,
    Purpose: "Kubernetes Cluster",
  },
  version: eksVersion,
  vpcId: eksVpc.vpcId,
});

/**
 * Cluster Exports
 * Export important cluster information
 */
export const clusterExports = {
  kubeconfig: cluster.kubeconfig.apply(JSON.stringify),
  clusterName: cluster.eksCluster.name,
  clusterArn: cluster.eksCluster.arn,
  clusterEndpoint: cluster.eksCluster.endpoint,
  clusterVersion: cluster.eksCluster.version,
  oidcIssuer: cluster.oidcIssuer,
  oidcProviderArn: cluster.oidcProviderArn,
};

/**
 * Create a managed node group (alternative to Karpenter)
 * @param name - Node group name
 * @param config - Node group configuration
 */
export function createManagedNodeGroup(
  name: string,
  config: {
    instanceTypes: string[];
    desiredSize: number;
    maxSize: number;
    minSize: number;
    labels?: Record<string, string>;
  }
) {
  return eks.createManagedNodeGroup(name, {
    cluster: cluster,
    enableIMDSv2: true,
    instanceTypes: config.instanceTypes,
    labels: {
      ondemand: "true",
      ...config.labels,
    },
    nodeGroupName: `${name}-nodegroup`,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    scalingConfig: {
      desiredSize: config.desiredSize,
      maxSize: config.maxSize,
      minSize: config.minSize,
    },
    tags: {
      ...tags,
      "karpenter.sh/discovery": eksClusterName,
    },
  });
}

/**
 * Get cluster information for add-ons
 * @returns Cluster information object
 */
export function getClusterInfo() {
  return {
    name: cluster.eksCluster.name,
    version: cluster.eksCluster.version,
    endpoint: cluster.eksCluster.endpoint,
    oidcIssuer: cluster.oidcIssuer,
    oidcProviderArn: cluster.oidcProviderArn,
  };
} 