/**
 * Pegasus EKS Infrastructure
 * Main entry point for the Pegasus EKS infrastructure platform
 */

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

import "./providers/aws";
import "./providers/github";

// ============================================================================
// CORE INFRASTRUCTURE
// ============================================================================

import { cluster, clusterExports } from "./core/cluster";
import { eksVpc, vpcExports } from "./core/networking";
import { instanceRoles, instanceProfiles } from "./core/iam";
import { wildcardCertificate, dnsExports } from "./core/dns";

// Export core components for module use
export { cluster, clusterExports };
export { eksVpc, vpcExports };
export { wildcardCertificate, dnsExports };

// ============================================================================
// KUBERNETES PROVIDER
// ============================================================================

import { createKubernetesProvider } from "./providers/kubernetes";

// Create Kubernetes provider after cluster is ready
const k8sProvider = createKubernetesProvider(cluster);

// Export Kubernetes provider for module use
export { createKubernetesProvider };

// ============================================================================
// ADD-ONS (Deployed after cluster is ready)
// ============================================================================

// Import add-ons (these will be deployed after the cluster is created)
import { deployArgoCD } from "./addons/argocd";
// import { deployMonitoring } from "./addons/monitoring";
// import { deployIngress } from "./addons/ingress";
// import { deployStorage } from "./addons/storage";
// import { deploySecrets } from "./addons/secrets";

// Export ArgoCD function for module use
export { deployArgoCD };

// ============================================================================
// DEPLOY ADD-ONS
// ============================================================================

// Deploy ArgoCD after cluster is ready
const argocdResources = deployArgoCD(k8sProvider);

// ============================================================================
// EXPORTS
// ============================================================================

// Core infrastructure exports
export const kubeconfig = clusterExports.kubeconfig;
export const clusterName = clusterExports.clusterName;
export const clusterArn = clusterExports.clusterArn;
export const clusterEndpoint = clusterExports.clusterEndpoint;
export const clusterVersion = clusterExports.clusterVersion;

// VPC exports
export const vpcId = vpcExports.vpcId;
export const privateSubnetIds = vpcExports.privateSubnetIds;
export const publicSubnetIds = vpcExports.publicSubnetIds;

// DNS exports
export const privateZoneId = dnsExports.privateZoneId;
export const publicZoneId = dnsExports.publicZoneId;
export const wildcardCertificateArn = dnsExports.wildcardCertificateArn;

// ArgoCD exports
export const argocdRelease = argocdResources.argocdRelease;
export const argocdDeployKey = argocdResources.deployKey;
export const argocdAdminPassword = argocdResources.adminPassword;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get cluster information for external use
 * @returns Cluster information object
 */
export function getClusterInfo() {
  return {
    name: clusterExports.clusterName,
    version: clusterExports.clusterVersion,
    endpoint: clusterExports.clusterEndpoint,
    region: "us-east-1", // This should come from config
    vpcId: vpcExports.vpcId,
    privateSubnets: vpcExports.privateSubnetIds,
    publicSubnets: vpcExports.publicSubnetIds,
  };
}

/**
 * Get add-on information
 * @returns Add-on information object
 */
export function getAddonInfo() {
  return {
    argocd: {
      release: argocdResources.argocdRelease,
      deployKey: argocdResources.deployKey,
      adminPassword: argocdResources.adminPassword,
    },
  };
} 