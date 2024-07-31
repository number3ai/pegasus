// DevOps General Configuration
export const environment = "dev";

// AWS General Configuration
export const region = "us-west-2"; // Set your desired AWS region here
export const awsProfile = "default"; // Set your AWS profile name here
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

interface EksAddon {
  name: string;
  version: string;
  configuration?: Map<string, any>;
}

export const eksAddons: EksAddon[] = [
  {
    name: "aws-ebs-csi-driver",
    version: "v1.32.0-eksbuild.1",
  },
  // {
  //   name: "aws-guardduty-agent",
  //   version: "v1.6.1-eksbuild.1",
  // },
  {
    name: "coredns",
    version: "v1.11.1-eksbuild.9",
  },
  {
    name: "eks-pod-identity-agent",
    version: "v1.30.0-eksbuild.1",
  },
  {
    name: "kube-proxy",
    version: "v1.30.0-eksbuild.3",
  },
  {
    name: "vpc-cni",
    version: "v1.18.3-eksbuild.1",
  },
]

// EKS Node Group Configuration
export const minSize = 3;
export const maxSize = 10;
export const desiredSize = 5;
export const instanceType = "t3.medium";

// ArgoCD Configuration
export const argoCdAppsVersion = "2.0.0";
export const argoCdVersion = "7.3.9";

// GitHub Configuration
export const githubOwner = "Cr0n1c";
export const githubRepository = "testRepo";
export const githubBootloaderPath = "charts/bootloader";

export const githubBootloaders = [
  "infrastructure",
  "security",
]
