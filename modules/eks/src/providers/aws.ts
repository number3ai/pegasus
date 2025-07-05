/**
 * AWS Provider Configuration
 * Centralized AWS provider setup for the Pegasus EKS infrastructure
 */

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { REGION } from "../config/variables";

/**
 * AWS Provider Configuration
 * Configures the AWS provider with proper region and settings
 */
export const awsProvider = new aws.Provider("aws", {
  region: REGION,
  defaultTags: {
    tags: {
      ManagedBy: "Pulumi",
      Project: "Pegasus",
    },
  },
});

/**
 * AWS Provider for cross-region operations
 * Used when resources need to be created in different regions
 */
export function createCrossRegionProvider(region: string): aws.Provider {
  return new aws.Provider(`aws-${region}`, {
    region,
    defaultTags: {
      tags: {
        ManagedBy: "Pulumi",
        Project: "Pegasus",
      },
    },
  });
}

/**
 * Get AWS account information
 * Returns the current AWS account ID and region
 */
export function getAwsAccountInfo(): pulumi.Output<{ accountId: string; region: string }> {
  const current = aws.getCallerIdentity({}, { provider: awsProvider });
  
  return current.apply(caller => ({
    accountId: caller.accountId,
    region: REGION,
  }));
}

/**
 * Validate AWS credentials and permissions
 * Ensures the AWS provider is properly configured
 */
export async function validateAwsProvider(): Promise<void> {
  try {
    const sts = new aws.sts.GetCallerIdentityOutput({}, { provider: awsProvider });
    await sts.accountId;
    
    console.log("✅ AWS provider configured successfully");
  } catch (error) {
    throw new Error(`❌ AWS provider validation failed: ${error}`);
  }
} 