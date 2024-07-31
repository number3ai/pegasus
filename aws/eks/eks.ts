import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

import { awsProvider } from "./providers";
import { awsProfile, desiredSize, eksClusterName, eksVersion, instanceType, minSize, maxSize, tags } from "./variables";

// Create a VPC for our cluster.
export const vpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`,
  {
    assignGeneratedIpv6CidrBlock: false,
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableNetworkAddressUsageMetrics: true,
    tags: tags,
  },
  {
    provider: awsProvider,
  },
);

// Create an EKS cluster without node group configuration.
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`,
  {
    createOidcProvider: true,
    enabledClusterLogTypes: [
      "api",
      "audit",
      "authenticator",
      "controllerManager",
      "scheduler",
    ],
    endpointPrivateAccess: true,
    endpointPublicAccess: true,
    name: eksClusterName,
    nodeRootVolumeEncrypted: true,
    nodeRootVolumeSize: 200,
    providerCredentialOpts: { profileName: awsProfile },
    subnetIds: vpc.publicSubnetIds,
    storageClasses: {
      gp2: {
        allowVolumeExpansion: true,
        default: true,
        encrypted: true,
        reclaimPolicy: "Delete",
        type: "gp2",
        volumeBindingMode: "Immediate",
      },
    },
    tags: tags,
    version: eksVersion,
    vpcId: vpc.vpcId,
  },
  {
    dependsOn: [vpc],
    provider: awsProvider,
  },
);

// Create the IAM role for EKS node group
const eksNodeRole = new aws.iam.Role(`${eksClusterName}-node-role`, {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "ec2.amazonaws.com",
  }),
  tags: tags,
});

// Attach required AmazonEKSWorkerNodePolicy policies to the IAM role
const requiredPolicies = [
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
  "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
];

requiredPolicies.forEach((policyArn, index) => {
  new aws.iam.RolePolicyAttachment(`${eksClusterName}-required-policy-${index}`, {
    role: cluster.instanceRoles[0].name,
    policyArn: policyArn,
  });
});

// Create an EKS managed node group.
new eks.ManagedNodeGroup(`${eksClusterName}-node-group`,
  {
    cluster: cluster,
    instanceTypes: [instanceType],
    nodeGroupName: `${eksClusterName}-nodegroup`,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    diskSize: 200,
    tags: tags,

    scalingConfig: {
      desiredSize: desiredSize,
      maxSize: maxSize,
      minSize: minSize,
    },
  },
  {
    dependsOn: [cluster],
    provider: awsProvider,
  },
);
