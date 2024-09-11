/**
 * General Configuration for DevOps, AWS, EKS, ArgoCD, GitHub, and Kubernetes.
 *
 * Breakdown:
 *
 * 1. **DevOps General Configuration**:
 *    - `environment`: Defines the deployment environment (e.g., "dev" for development).
 *
 * 2. **AWS General Configuration**:
 *    - `region`: Specifies the AWS region to deploy resources (e.g., "us-west-2").
 *    - `awsProfile`: The AWS credentials profile used for authentication (e.g., "default").
 *    - `tags`: Common AWS tags applied to resources for identification and management.
 *      - `Environment`: Environment in which the resources are deployed.
 *      - `ManagedBy`: Tool managing the infrastructure (e.g., "Pulumi").
 *
 * 3. **DNS Configuration**:
 *    - `dnsPublicDomain`: The public DNS domain (e.g., "domain.com").
 *    - `dnsPrivateDomain`: The internal private DNS domain for internal networking (e.g., "int.domain.com").
 *
 * 4. **EKS General Configuration**:
 *    - `eksVersion`: Specifies the Kubernetes version for the EKS cluster (e.g., "1.30").
 *    - `eksClusterName`: Name of the EKS cluster (e.g., "dev").
 *    - `eksNodeRootVolumeSize`: The root volume size (in GB) for the EKS worker nodes.
 *    - `eksVPCCIDRBlock`: The CIDR block for the EKS VPC (e.g., "10.100.0.0/16").
 *
 * 5. **EKS Node Group Configuration**:
 *    - `minSize`: The minimum number of worker nodes in the EKS node group.
 *    - `maxSize`: The maximum number of worker nodes in the EKS node group.
 *    - `desiredSize`: The desired number of worker nodes for the EKS node group.
 *    - `instanceType`: Specifies the EC2 instance type for the EKS worker nodes (e.g., "t3.large").
 *
 * 6. **ArgoCD Configuration**:
 *    - `argoCdAppsVersion`: Specifies the version of the ArgoCD applications (e.g., "2.0.0").
 *    - `argoCdVersion`: Specifies the version of the ArgoCD installation (e.g., "7.3.9").
 *
 * 7. **GitHub Configuration**:
 *    - `githubOwner`: The GitHub organization or user owning the repository (e.g., "Cr0n1c").
 *    - `githubRepository`: The GitHub repository for bootstrapping infrastructure (e.g., "testRepo").
 *    - `githubBootloaderPath`: The path within the repository where bootloader charts are located.
 *    - `githubBootloaders`: List of bootloader names (e.g., "infrastructure", "security") used for initial deployment.
 *
 * 8. **Kubernetes Configuration**:
 *    - `serviceMesh`: Specifies the service mesh technology (e.g., "cilium").
 *
 * Summary:
 * This file provides configuration for various infrastructure components such as AWS, EKS, DNS, GitHub, ArgoCD, and Kubernetes.
 * These settings are used to manage deployments and resource configurations for a DevOps environment.
 */

// DevOps General Configuration
export const environment = "dev";

// AWS General Configuration
export const region = "us-west-2";
export const awsProfile = "default";
export const tags = {
  Environment: environment,
  ManagedBy: "Pulumi",
};

// DNS Configuration
export const dnsPublicDomain = "domain.com";
export const dnsPrivateDomain = "int.domain.com";

// EKS General Configuration
export const eksVersion = "1.30";
export const eksClusterName = "dev";
export const eksNodeRootVolumeSize = 200;
export const eksVPCCIDRBlock = "10.100.0.0/16";

// EKS Node Group Configuration
export const minSize = 4;
export const maxSize = 8;
export const desiredSize = 4;
export const instanceType = "t3.large";

// ArgoCD Configuration
export const argoCdAppsVersion = "2.0.1";
export const argoCdVersion = "7.3.9";

// GitHub Configuration
export const githubOwner = "number3ai";
export const githubRepository = "caprica";
export const githubBootloaderPath = "charts/bootloader";
export const githubBootloaders = ["infrastructure", "security"];

