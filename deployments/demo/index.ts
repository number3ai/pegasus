/**
 * Pegasus Demo Deployment
 * Demo deployment of the Pegasus EKS infrastructure module
 */

import * as pulumi from "@pulumi/pulumi";

// Import the EKS module
import { EKSModule } from "../../modules/eks";

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = new pulumi.Config();

// Demo configuration - only specifying what differs from module defaults
const demoConfig = {
  environment: "demo", // Override default 'dev' environment
  accountId: "783634644742",
  // clusterName: "demo-cluster", // Uses default: parent folder name + "-cluster"
  publicDomain: "demo.playground.com",
  privateDomain: "int.demo.playground.com",
  github: {
    owner: "number3ai",
    repository: "caprica",
    bootloaderPath: "charts/bootloader",
    bootloaders: ["infrastructure", "security"],
  },
  tags: {
    Environment: "demo",
    ManagedBy: "Pulumi",
    Project: "Pegasus",
    Component: "EKS",
    Purpose: "Demo",
  },
};

// ============================================================================
// INFRASTRUCTURE DEPLOYMENT
// ============================================================================

// Create the EKS infrastructure using the module
const eksInfrastructure = new EKSModule("demo-eks", demoConfig, {
  protect: false, // Allow destruction for demo
});

// ============================================================================
// EXPORTS
// ============================================================================

// Export cluster information
export const clusterName = eksInfrastructure.outputs.cluster.name;
export const clusterArn = eksInfrastructure.outputs.cluster.arn;
export const clusterEndpoint = eksInfrastructure.outputs.cluster.endpoint;
export const clusterVersion = eksInfrastructure.outputs.cluster.version;
export const kubeconfig = eksInfrastructure.outputs.cluster.kubeconfig;

// Export VPC information
export const vpcId = eksInfrastructure.outputs.vpc.id;
export const privateSubnetIds = eksInfrastructure.outputs.vpc.privateSubnetIds;
export const publicSubnetIds = eksInfrastructure.outputs.vpc.publicSubnetIds;

// Export DNS information
export const privateZoneId = eksInfrastructure.outputs.dns.privateZoneId;
export const publicZoneId = eksInfrastructure.outputs.dns.publicZoneId;
export const wildcardCertificateArn = eksInfrastructure.outputs.dns.wildcardCertificateArn;

// Export ArgoCD information
export const argocdRelease = eksInfrastructure.outputs.argocd?.release;
export const argocdDeployKey = eksInfrastructure.outputs.argocd?.deployKey;
export const argocdAdminPassword = eksInfrastructure.outputs.argocd?.adminPassword;

// ============================================================================
// DEMO-SPECIFIC RESOURCES
// ============================================================================

// Example: Create a simple Kubernetes namespace for demo applications
import * as kubernetes from "@pulumi/kubernetes";

const k8sProvider = new kubernetes.Provider("demo-k8s", {
  kubeconfig: kubeconfig.apply(JSON.stringify),
});

// Create a demo namespace
const demoNamespace = new kubernetes.core.v1.Namespace("demo-namespace", {
  metadata: {
    name: "demo",
    labels: {
      "app.kubernetes.io/name": "demo",
      "app.kubernetes.io/part-of": "pegasus",
      environment: "demo",
    },
  },
}, {
  provider: k8sProvider,
});

// Export the demo namespace
export const demoNamespaceName = demoNamespace.metadata.name;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get cluster information for external use
 */
export function getClusterInfo() {
  return eksInfrastructure.getClusterInfo();
}

/**
 * Get add-on information
 */
export function getAddonInfo() {
  return eksInfrastructure.getAddonInfo();
} 