import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { cluster } from "../eks";
import { eksClusterName, tags } from "../variables";

export type CustomPolicy = {
  actions: string[];
  resources: string[];
};

export function createIRSARole(
  service: string,
  namespace: string,
  awsPolicies: string[] = [],
  customPolicies: Array<CustomPolicy> = []
): aws.iam.Role {
  const irsaRoleName = `${service}-sa`; // Define the IAM Role name for the service account

  const irsaRole = new aws.iam.Role(
    `role-irsa-${service}`, // Unique name for the IAM Role
    {
      name: irsaRoleName, // Set the IAM Role name
      assumeRolePolicy: pulumi
        .all([
          cluster.core.oidcProvider?.arn, // ARN of the OIDC provider
          cluster.core.oidcProvider?.url, // URL of the OIDC provider
        ])
        .apply(([arn, url]) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Action: "sts:AssumeRoleWithWebIdentity", // Permission for the service account to assume this role
                Effect: "Allow",
                Principal: {
                  Federated: arn, // Use the OIDC provider ARN
                },
                Condition: {
                  StringEquals: {
                    [`${url}:aud`]: "sts.amazonaws.com", // Verify audience matches
                    [`${url}:sub`]: `system:serviceaccount:${namespace}:${irsaRoleName}`, // Ensure the service account matches
                  },
                },
              },
            ],
          })
        ),
      tags: {
        ...tags, // Apply default tags
        ...{
          cluster: eksClusterName, // Tag with EKS cluster name
          service: service, // Tag with service name
          namespace: namespace, // Tag with namespace name
        },
      },
    },
    {
      dependsOn: [cluster], // Ensure the EKS cluster is created before this role
    }
  );

  // Attach predefined AWS policies to the IAM Role
  awsPolicies.forEach((policy, index) => {
    new aws.iam.RolePolicyAttachment(
      `policy-${service}-attachment-${index}`, // Unique name for each policy attachment
      {
        role: irsaRole.name, // Attach the policy to the IAM Role
        policyArn: policy, // ARN of the AWS policy to attach
      }
    );
  });

  // Attach custom policies if provided
  if (customPolicies.length > 0) {
    new aws.iam.RolePolicy(
      `policy-attachment-${service}-custom-policy`, // Name of the IAM Role Policy Attachment for custom policies
      {
        role: irsaRole.name, // Attach custom policies to the IAM Role
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: customPolicies.map((customPolicy) => ({
            Effect: "Allow",
            Action: customPolicy.actions, // Actions allowed by the custom policy
            Resource: customPolicy.resources, // Resources the custom policy applies to
          })),
        }),
      }
    );
  }

  return irsaRole; // Return the created IAM Role
}
