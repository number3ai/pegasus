import * as awsx from "@pulumi/awsx"; // Import AWS Crosswalk (awsx) resources for networking

import {
  eksClusterName, // Name of the EKS cluster
  eksVPCCIDRBlock, // CIDR block for the VPC
  tags, // Tags to attach to AWS resources
} from "./variables"; // Import variables from the variables file

// Create a VPC for our EKS cluster with public and private subnets
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
