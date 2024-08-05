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
export const dnsPublicDomain = "int.domain.com";
export const dnsPrivateDomain = "domain.com";

// EKS General Configuration
export const eksVersion = "1.30";
export const eksClusterName = "dev";
export const eksNodeRootVolumeSize = 200;
export const eksVPCCIDRBlock = "10.100.0.0/16";

// EKS Node Group Configuration
export const minSize = 4;
export const maxSize = 8;
export const desiredSize = 4;
export const instanceType = "t3.medium";
export const eksNodesAMI = "ami-0aed8dba35aa48c75";

// ArgoCD Configuration
export const argoCdAppsVersion = "2.0.0";
export const argoCdVersion = "7.3.9";

// GitHub Configuration
export const githubOwner = "Cr0n1c";
export const githubRepository = "testRepo";
export const githubBootloaderPath = "charts/bootloader";
export const githubBootloaders = ["infrastructure", "security"];
