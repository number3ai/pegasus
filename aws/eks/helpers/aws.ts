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
): pulumi.Output<string> { 
  const irsaRoleName = `${service}-sa`;

  const irsaRole = new aws.iam.Role(
    `role-irsa-${service}`,
    {
      name: irsaRoleName,
      assumeRolePolicy: pulumi
        .all([
          cluster.core.oidcProvider?.arn,
          cluster.core.oidcProvider?.url,
        ])
        .apply(([arn, url]) =>
          JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Action: "sts:AssumeRoleWithWebIdentity",
                Effect: "Allow",
                Principal: {
                  Federated: arn,
                },
                Condition: {
                  StringEquals: {
                    [`${url}:aud`]: "sts.amazonaws.com",
                    [`${url}:sub`]: `system:serviceaccount:${namespace}:${irsaRoleName}`,
                  },
                },
              },
            ],
          })
        ),
      tags: {
        ...tags,
        cluster: eksClusterName,
        service: service,
        namespace: namespace,
      },
    },
    {
      dependsOn: [cluster],
    }
  );

  // Attach AWS policies
  awsPolicies.forEach((policy, index) => {
    new aws.iam.RolePolicyAttachment(
      `policy-${service}-attachment-${index}`,
      {
        role: irsaRole.name,
        policyArn: policy,
      }
    );
  });

  // Attach custom policies
  if (customPolicies.length > 0) {    
    new aws.iam.RolePolicy(
      `policy-attachment-${service}-custom-policy`,
      {
        role: irsaRole.name,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: customPolicies.map((customPolicy) => ({
            Effect: "Allow",
            Action: customPolicy.actions,
            Resource: customPolicy.resources,
          })),
        }),
      }
    );
  }

  return irsaRole.arn; // Return the role's ARN as a pulumi.Output
}
