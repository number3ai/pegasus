/**
 * This Pulumi code sets up an AWS EKS cluster along with its associated VPC, IAM roles,
 * and a managed node group for Kubernetes workloads.
 * 
 * Breakdown:
 * 
 * 1. VPC Creation:
 *    - `eksVpc` creates a VPC using Pulumi's `awsx` package for the EKS cluster.
 *    - Key properties:
 *      - No IPv6 CIDR block is assigned (`assignGeneratedIpv6CidrBlock: false`).
 *      - The CIDR block is defined by the `eksVPCCIDRBlock` variable.
 *      - DNS support and network address usage metrics are enabled.
 *      - Subnets are automatically created (both public and private subnets).
 *      - Custom tags are added to the VPC using the `tags` variable.
 * 
 * 2. IAM Role Creation:
 *    - `instanceRoles` creates 3 IAM roles using the `createRoles` function from the `eks-iam` module.
 *    - These roles are assigned to the EKS cluster's worker nodes.
 * 
 * 3. EKS Cluster Creation:
 *    - `cluster` creates an EKS cluster without configuring a default node group (`skipDefaultNodeGroup: true`).
 *    - Key properties:
 *      - OIDC provider is enabled for IAM roles (`createOidcProvider: true`).
 *      - Cluster logs are enabled for API, audit, authenticator, controller manager, and scheduler components.
 *      - Public access to the EKS API endpoint is enabled.
 *      - The cluster is deployed in private subnets for the worker nodes and public subnets for the control plane.
 *      - The root volume for the nodes is encrypted and has a configurable size (`nodeRootVolumeSize`).
 *      - A default storage class (`gp2`) is defined for Kubernetes with encrypted volumes.
 * 
 * 4. EKS Managed Node Group Creation:
 *    - A managed node group is created using `eks.createManagedNodeGroup`.
 *    - Key properties:
 *      - The node group is associated with the cluster created earlier.
 *      - IMDSv2 (Instance Metadata Service v2) is enabled for enhanced security.
 *      - EC2 instance types are specified by the `instanceType` variable.
 *      - The scaling configuration is determined by `desiredSize`, `minSize`, and `maxSize` variables.
 *      - Tags and Kubernetes labels are applied to the node group.
 *      - If the `serviceMesh` is set to "cilium", a node taint is applied to prevent scheduling until the Cilium agent is ready.
 * 
 * 5. Kubeconfig:
 *    - The kubeconfig file is exported from the cluster's `kubeconfig` property, which can be used to configure `kubectl` for cluster management.
 * 
 * Summary:
 * This code sets up an EKS cluster in a custom VPC with appropriate IAM roles, a managed node group, 
 * and security configurations. The cluster is ready for workloads with scalable and secure nodes.
 */

import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

import * as iam from "./eks-iam";

import {
  desiredSize,
  eksClusterName,
  eksNodeRootVolumeSize,
  eksVersion,
} from "./variables";
import {
  eksVPCCIDRBlock,
  instanceType,
  minSize,
  maxSize,
  serviceMesh,
  tags,
} from "./variables";

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
  taints: 
    serviceMesh == "cilium" 
      ? [
          {
            key: "node.cilium.io/agent-not-ready",
            value: "true",
            effect: "NO_EXECUTE",
          },
        ]
      : [],
});

export const kubeconfig = cluster.kubeconfig.apply(JSON.stringify);
