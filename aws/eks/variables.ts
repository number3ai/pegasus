// DevOps General Configuration
export const accountId = "783634644742";
export const environment = "dev";

// AWS General Configuration
export const region = "us-east-1";
export const tags = {
  Environment: environment,
  ManagedBy: "Pulumi",
};

// DNS Configuration
export const dnsPublicDomain = "playground.com";
export const dnsPrivateDomain = "int.playground.com";

// EKS General Configuration
export const eksVersion = "1.32";
export const eksClusterName = "dev";
export const eksNodeRootVolumeSize = 200;
export const eksPublicAccess = [ "0.0.0.0/0" ];
export const eksVPCCIDRBlock = "10.100.0.0/16";

// EKS Node Group Configuration
export const minSize = 4;
export const maxSize = 8;
export const desiredSize = 4;
export const instanceType = "t3.large";

// ArgoCD Configuration
export const argoCdAppsVersion = "2.0.2";
export const argoCdVersion = "7.8.23";

// GitHub Configuration
export const githubOwner = "number3ai";
export const githubRepository = "caprica";
export const githubBootloaderPath = "charts/bootloader";
export const githubBootloaders = ["infrastructure", "security"];
