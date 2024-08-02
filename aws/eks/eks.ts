import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

import * as iam from "./eks-iam";
import { awsProfile, desiredSize, eksClusterName, eksNodesAMI, eksNodeRootVolumeSize, eksVersion } from "./variables";
import { instanceType, minSize, maxSize, tags } from "./variables";

// Create a VPC for our cluster.
export const vpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`,
  {
    assignGeneratedIpv6CidrBlock: false,
    cidrBlock: "10.100.0.0/16",
    enableDnsSupport: true,
    enableNetworkAddressUsageMetrics: true,
    subnetStrategy: "Auto",
    subnetSpecs: [
      { type: awsx.ec2.SubnetType.Public },
      { type: awsx.ec2.SubnetType.Private },
    ],
    tags: tags,
  }
);

// Export VPC ID and Subnets.
export const vpcId = vpc.vpcId;
export const allVpcSubnets = pulumi.all([vpc.privateSubnetIds, vpc.publicSubnetIds])
                                   .apply(([privateSubnetIds, publicSubnetIds]) => privateSubnetIds.concat(publicSubnetIds));

// Create 3 IAM Roles and matching InstanceProfiles to use with the nodegroups.
const roles = iam.createRoles(eksClusterName, 3);
const instanceProfiles = iam.createInstanceProfiles(eksClusterName, roles);

// Create an EKS cluster without node group configuration.
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`,
  {
    createOidcProvider: true,
    deployDashboard: false,
    enabledClusterLogTypes: [
      "api",
      "audit",
      "authenticator",
      "controllerManager",
      "scheduler",
    ],
    endpointPrivateAccess: true,
    endpointPublicAccess: true,
    instanceRoles: roles,
    name: eksClusterName,
    nodeAssociatePublicIpAddress: false,
    nodeRootVolumeEncrypted: true,
    nodeRootVolumeSize: eksNodeRootVolumeSize,
    providerCredentialOpts: { 
      profileName: awsProfile 
    },
    skipDefaultNodeGroup: true,
    subnetIds: allVpcSubnets,
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
  }
);

new eks.NodeGroup(`${eksClusterName}-nodegroup`, {
  cluster: cluster,
  amiId: eksNodesAMI,
  clusterIngressRule: cluster.eksClusterIngressRule,
  desiredCapacity: desiredSize,
  instanceProfile: instanceProfiles[0],
  instanceType: instanceType,
  maxSize: maxSize,
  minSize: minSize,
  nodeAssociatePublicIpAddress: false,
  nodeRootVolumeSize: eksNodeRootVolumeSize,
  nodeRootVolumeEncrypted: true,
  nodeSecurityGroup: cluster.nodeSecurityGroup,
  labels: {
    amiId: eksNodesAMI
  },
}, {
  providers: { 
    kubernetes: cluster.provider
  },
});
