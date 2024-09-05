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

import * as awsx from "@pulumi/awsx"; // Import AWS Crosswalk (awsx) resources for networking
import * as eks from "@pulumi/eks"; // Import Pulumi EKS module for managing Amazon EKS clusters

import { createRoles } from "./eks-iam"; // Import a function to create IAM roles from a custom module
import {
  desiredSize, // Desired number of nodes in the node group
  eksClusterName, // Name of the EKS cluster
  eksNodeRootVolumeSize, // Size of the EBS root volume attached to the EKS nodes
  eksVersion, // EKS Kubernetes version
  eksVPCCIDRBlock, // CIDR block for the VPC
  instanceType, // EC2 instance type for the worker nodes
  minSize, // Minimum number of worker nodes
  maxSize, // Maximum number of worker nodes
  tags, // Tags to attach to AWS resources
} from "./variables"; // Import variables from the variables file

// Create a VPC (Virtual Private Cloud) for our EKS cluster.
// This will automatically create public and private subnets for the cluster.
export const eksVpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`, {
  assignGeneratedIpv6CidrBlock: false, // Disable IPv6 CIDR block assignment
  cidrBlock: eksVPCCIDRBlock, // Use the specified CIDR block
  enableDnsSupport: true, // Enable DNS support in the VPC
  enableNetworkAddressUsageMetrics: true, // Enable network address usage metrics
  subnetStrategy: "Auto", // Automatically create subnets
  subnetSpecs: [
    { type: awsx.ec2.SubnetType.Public }, // Public subnets for external access
    { type: awsx.ec2.SubnetType.Private }, // Private subnets for internal resources
  ],
  tags: tags, // Attach tags to the VPC and associated subnets
});

// Create IAM instance roles for the EKS worker nodes.
export const instanceRoles = createRoles(
  `${eksClusterName}-instance-role`, // Base name for the roles
  3 // Create 3 instance roles for the EKS node group
);

// Create an EKS cluster without the default node group.
// We will configure the node group separately using managed node groups.
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`, {
  createOidcProvider: true, // Enable OIDC provider for IAM roles for service accounts (IRSA)
  deployDashboard: false, // Disable the Kubernetes dashboard deployment
  enabledClusterLogTypes: [
    // Enable cluster logging for key components
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler",
  ],
  endpointPublicAccess: true, // Enable public access to the EKS API endpoint
  instanceRoles: instanceRoles, // Attach the created instance roles to the cluster
  name: eksClusterName, // Name of the EKS cluster
  nodeAssociatePublicIpAddress: false, // Disable public IP addresses for worker nodes
  nodeRootVolumeEncrypted: true, // Encrypt the root EBS volumes of the worker nodes
  nodeRootVolumeSize: eksNodeRootVolumeSize, // Set the size of the root EBS volume
  privateSubnetIds: eksVpc.privateSubnetIds, // Use private subnets for worker nodes
  publicSubnetIds: eksVpc.publicSubnetIds, // Use public subnets for load balancers
  skipDefaultNodeGroup: true, // Skip creation of the default node group
  storageClasses: {
    // Define default storage classes for the cluster
    gp2: {
      allowVolumeExpansion: true, // Enable volume expansion for storage classes
      default: true, // Set as the default storage class
      encrypted: true, // Encrypt the volumes
      reclaimPolicy: "Delete", // Delete the volumes when the PVC is deleted
      type: "gp2", // Use the gp2 storage type
      volumeBindingMode: "Immediate", // Immediately bind the volumes
    },
  },
  tags: tags, // Attach tags to the EKS cluster
  version: eksVersion, // Specify the Kubernetes version for the cluster
  vpcId: eksVpc.vpcId, // Use the VPC created for the EKS cluster
});

// Create an EKS managed node group.
// Managed node groups automatically handle the provisioning and lifecycle of worker nodes.
eks.createManagedNodeGroup(`${eksClusterName}-node-group`, {
  cluster: cluster, // Associate the node group with the created EKS cluster
  enableIMDSv2: true, // Enable Instance Metadata Service version 2 (IMDSv2)
  instanceTypes: [instanceType], // Specify the EC2 instance types for the worker nodes
  labels: {
    ondemand: "true", // Label the node group as on-demand nodes
  },
  nodeGroupName: `${eksClusterName}-nodegroup`, // Name of the node group
  nodeRoleArn: cluster.instanceRoles[0].arn, // Use the first instance role created earlier
  scalingConfig: {
    // Configure the scaling parameters for the node group
    desiredSize: desiredSize, // Desired number of worker nodes
    maxSize: maxSize, // Maximum number of worker nodes
    minSize: minSize, // Minimum number of worker nodes
  },
  tags: tags, // Attach tags to the node group
});

// Export the kubeconfig for the EKS cluster.
// The kubeconfig is required to interact with the Kubernetes API.
export const kubeconfig = cluster.kubeconfig.apply(JSON.stringify);
