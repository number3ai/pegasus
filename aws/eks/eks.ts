/* EKS
   ---
   This file contains the setup for the EKS essentials such as the EKS cluster, node group, 
   required networking, and any other resources needed to support the EKS cluster.
*/

import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

import * as iam from "./eks-iam";

import { desiredSize, eksClusterName, eksNodeRootVolumeSize, eksVersion } from "./variables";
import { eksVPCCIDRBlock, instanceType, minSize, maxSize, serviceMesh, tags } from "./variables";

// Create a VPC for our cluster.
export const eksVpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`, {
  assignGeneratedIpv6CidrBlock: false,
  cidrBlock: eksVPCCIDRBlock,
  enableDnsSupport: true,
  enableNetworkAddressUsageMetrics: true,
  subnetStrategy: "Auto",
  subnetSpecs: [
    { type: awsx.ec2.SubnetType.Public },
    { type: awsx.ec2.SubnetType.Private },
  ],
  tags: tags,
});

// Create an instance role for the EKS cluster.
export const instanceRoles = iam.createRoles(
  `${eksClusterName}-instance-role`,
  3
);

// Create an EKS cluster without node group configuration. We will add this later.
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`, {
  createOidcProvider: true,
  deployDashboard: false,
  enabledClusterLogTypes: [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler",
  ],
  endpointPublicAccess: true,
  instanceRoles: instanceRoles,
  name: eksClusterName,
  nodeAssociatePublicIpAddress: false,
  nodeRootVolumeEncrypted: true,
  nodeRootVolumeSize: eksNodeRootVolumeSize,
  privateSubnetIds: eksVpc.privateSubnetIds,
  publicSubnetIds: eksVpc.publicSubnetIds,
  skipDefaultNodeGroup: true,
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
  vpcId: eksVpc.vpcId,
});

// Create an EKS managed node group.
eks.createManagedNodeGroup(`${eksClusterName}-node-group`, {
  cluster: cluster,
  enableIMDSv2: true,
  instanceTypes: [instanceType],
  labels: {
    ondemand: "true",
  },
  nodeGroupName: `${eksClusterName}-nodegroup`,
  nodeRoleArn: cluster.instanceRoles[0].arn,
  scalingConfig: {
    desiredSize: desiredSize,
    maxSize: maxSize,
    minSize: minSize,
  },
  tags: tags,
  taints: serviceMesh == "cilium" ? [
    {
      key: "node.cilium.io/agent-not-ready",
      value: "true",
      effect: "NO_EXECUTE",
    },
  ] : []
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
