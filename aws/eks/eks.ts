import * as eks from "@pulumi/eks"; // Import Pulumi EKS module for managing Amazon EKS clusters

import { eksVpc } from "./networking"; // Import the VPC created for the EKS cluster
import { instanceRoles } from "./eks-iam"; // Import the IAM roles for EKS worker nodes
import {
  desiredSize, // Desired number of nodes in the node group
  eksClusterName, // Name of the EKS cluster
  eksNodeRootVolumeSize, // Size of the EBS root volume attached to the EKS nodes
  eksPublicAccess, // CIDR blocks for public access to the EKS API
  eksVersion, // EKS Kubernetes version
  instanceType, // EC2 instance type for the worker nodes
  minSize, // Minimum number of worker nodes
  maxSize, // Maximum number of worker nodes
  tags, // Tags to attach to AWS resources
} from "./variables"; // Import variables from the variables file

// Create an EKS cluster with custom configurations
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`, {
  autoMode: {
    enabled: true, // Enable auto mode for the cluster
  },
  createOidcProvider: true, // Enable OIDC provider for IAM roles for service accounts (IRSA)
  enabledClusterLogTypes: [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler",
  ], // Enable cluster logging for key components
  endpointPublicAccess: true, // Enable public access to the EKS API endpoint
  endpointPrivateAccess: true, // Enable public access to the EKS API endpoint
  publicAccessCidrs: eksPublicAccess, // List of CIDR blocks for public access to the EKS API
  instanceRoles: instanceRoles, // Attach the created instance roles to the cluster
  name: eksClusterName, // Name of the EKS cluster
  nodeAssociatePublicIpAddress: false, // Disable public IP addresses for worker nodes
  nodeRootVolumeEncrypted: true, // Encrypt the root EBS volumes of the worker nodes
  nodeRootVolumeSize: eksNodeRootVolumeSize, // Set the size of the root EBS volume
  privateSubnetIds: eksVpc.privateSubnetIds, // Use private subnets for worker nodes
  publicSubnetIds: eksVpc.publicSubnetIds, // Use public subnets for load balancers
  skipDefaultNodeGroup: true, // Skip creation of the default node group
  storageClasses: {
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

// // Create an EKS managed node group
// eks.createManagedNodeGroup(`${eksClusterName}-node-group`, {
//   cluster: cluster, // Associate the node group with the created EKS cluster
//   enableIMDSv2: true, // Enable Instance Metadata Service version 2 (IMDSv2)
//   instanceTypes: [instanceType], // Specify the EC2 instance types for the worker nodes
//   labels: {
//     ondemand: "true", // Label the node group as on-demand nodes
//   },
//   nodeGroupName: `${eksClusterName}-nodegroup`, // Name of the node group
//   nodeRoleArn: cluster.instanceRoles[0].arn, // Use the first instance role created earlier
//   scalingConfig: {
//     desiredSize: desiredSize, // Desired number of worker nodes
//     maxSize: maxSize, // Maximum number of worker nodes
//     minSize: minSize, // Minimum number of worker nodes
//   },
//   tags: { 
//     ...tags, // Attach default tags to the node group
//     "karpenter.sh/discovery": eksClusterName, // Custom tag for Karpenter discovery
//   },
// });

// Export the kubeconfig for the EKS cluster
export const kubeconfig = cluster.kubeconfig.apply(JSON.stringify);
