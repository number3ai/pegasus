/**
 * IAM Roles for Service Accounts (IRSA) Utilities
 * Helper functions for creating and managing IRSA roles in the Pegasus EKS infrastructure
 */

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { eksClusterName, tags } from "../config/variables";
import { NAMING_PATTERNS } from "../config/constants";

/**
 * Custom policy configuration interface
 */
export interface CustomPolicy {
  actions: string[];
  resources: string[];
}

/**
 * IRSA role configuration interface
 */
export interface IRSARoleConfig {
  service: string;
  namespace: string;
  awsPolicies?: string[];
  customPolicies?: CustomPolicy[];
  tags?: Record<string, string>;
}

/**
 * Create an IAM Role for Service Account (IRSA)
 * @param config - IRSA role configuration
 * @returns Promise that resolves to the role ARN
 */
export function createIRSARole(config: IRSARoleConfig): pulumi.Output<string> {
  const {
    service,
    namespace,
    awsPolicies = [],
    customPolicies = [],
    tags: customTags = {},
  } = config;

  const irsaRoleName = NAMING_PATTERNS.ROLE.replace("{service}", service);

  // Create the assume role policy for IRSA
  const assumeRolePolicy = createAssumeRolePolicy(namespace, irsaRoleName);

  // Create the IAM role
  const irsaRole = new aws.iam.Role(`role-irsa-${service}`, {
    name: irsaRoleName,
    assumeRolePolicy,
    tags: {
      ...tags,
      cluster: eksClusterName,
      service,
      namespace,
      ...customTags,
    },
  });

  // Attach AWS managed policies
  awsPolicies.forEach((policy, index) => {
    new aws.iam.RolePolicyAttachment(`policy-${service}-attachment-${index}`, {
      role: irsaRole.name,
      policyArn: policy,
    });
  });

  // Create custom policy if provided
  if (customPolicies.length > 0) {
    new aws.iam.RolePolicy(`policy-attachment-${service}-custom-policy`, {
      role: irsaRole.name,
      policy: createCustomPolicyDocument(customPolicies),
    });
  }

  return irsaRole.arn;
}

/**
 * Create assume role policy for IRSA
 * @param namespace - Kubernetes namespace
 * @param serviceAccountName - Service account name
 * @returns JSON string of the assume role policy
 */
function createAssumeRolePolicy(namespace: string, serviceAccountName: string): pulumi.Output<string> {
  // This would typically use the cluster's OIDC provider
  // For now, we'll create a placeholder that will be updated when the cluster is available
  return pulumi.output(JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRoleWithWebIdentity",
        Effect: "Allow",
        Principal: {
          Federated: "arn:aws:iam::ACCOUNT_ID:oidc-provider/OIDC_PROVIDER",
        },
        Condition: {
          StringEquals: {
            "OIDC_PROVIDER:aud": "sts.amazonaws.com",
            "OIDC_PROVIDER:sub": `system:serviceaccount:${namespace}:${serviceAccountName}`,
          },
        },
      },
    ],
  }));
}

/**
 * Create custom policy document
 * @param customPolicies - Array of custom policies
 * @returns JSON string of the policy document
 */
function createCustomPolicyDocument(customPolicies: CustomPolicy[]): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: customPolicies.map(policy => ({
      Effect: "Allow",
      Action: policy.actions,
      Resource: policy.resources,
    })),
  });
}

/**
 * Update IRSA role with cluster OIDC information
 * @param role - The IRSA role to update
 * @param oidcIssuer - OIDC issuer URL
 * @param oidcProviderArn - OIDC provider ARN
 * @param namespace - Kubernetes namespace
 * @param serviceAccountName - Service account name
 */
export function updateIRSARoleWithOIDC(
  role: aws.iam.Role,
  oidcIssuer: string,
  oidcProviderArn: string,
  namespace: string,
  serviceAccountName: string
): void {
  const assumeRolePolicy = pulumi.all([oidcIssuer, oidcProviderArn]).apply(([issuer, providerArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRoleWithWebIdentity",
          Effect: "Allow",
          Principal: {
            Federated: providerArn,
          },
          Condition: {
            StringEquals: {
              [`${issuer}:aud`]: "sts.amazonaws.com",
              [`${issuer}:sub`]: `system:serviceaccount:${namespace}:${serviceAccountName}`,
            },
          },
        },
      ],
    })
  );

  role.assumeRolePolicy = assumeRolePolicy;
} 