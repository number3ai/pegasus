/**
 * Pegasus EKS Infrastructure Module
 * Reusable EKS infrastructure module for the Pegasus platform
 */

// Export the existing infrastructure as a module
export * from "./src";

// Export the main infrastructure components
export { cluster, clusterExports } from "./src/core/cluster";
export { eksVpc, vpcExports } from "./src/core/networking";
export { instanceRoles, instanceProfiles } from "./src/core/iam";
export { wildcardCertificate, dnsExports } from "./src/core/dns";
export { deployArgoCD } from "./src/addons/argocd";

// Export configuration
export * from "./src/config/constants";
export * from "./src/config/variables";

// Export utilities
export * from "./src/utils/git";
export * from "./src/utils/irsa";
export * from "./src/utils/yaml";

// Export providers
export * from "./src/providers/aws";
export * from "./src/providers/github";
export * from "./src/providers/kubernetes";

// Export the module wrapper
export * from "./module"; 