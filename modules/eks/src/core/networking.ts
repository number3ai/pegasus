/**
 * Networking Infrastructure
 * VPC and networking setup for the Pegasus EKS infrastructure
 */

import * as awsx from "@pulumi/awsx";

import { eksClusterName, eksVPCCIDRBlock, tags } from "../config/variables";
import { NETWORK } from "../config/constants";

/**
 * EKS VPC Configuration
 * Creates a VPC with public and private subnets for the EKS cluster
 */
export const eksVpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`, {
  assignGeneratedIpv6CidrBlock: NETWORK.ENABLE_IPV6,
  cidrBlock: eksVPCCIDRBlock,
  enableDnsSupport: NETWORK.ENABLE_DNS,
  enableNetworkAddressUsageMetrics: NETWORK.ENABLE_METRICS,
  subnetStrategy: "Auto",
  subnetSpecs: [
    { type: awsx.ec2.SubnetType.Public },
    { type: awsx.ec2.SubnetType.Private },
  ],
  tags: {
    ...tags,
    Name: `${eksClusterName}-vpc`,
    Purpose: "EKS Cluster Networking",
  },
});

/**
 * Export VPC information for use in other modules
 */
export const vpcExports = {
  vpcId: eksVpc.vpcId,
  privateSubnetIds: eksVpc.privateSubnetIds,
  publicSubnetIds: eksVpc.publicSubnetIds,
  natGatewayIds: eksVpc.natGatewayIds,
  internetGatewayId: eksVpc.internetGatewayId,
}; 