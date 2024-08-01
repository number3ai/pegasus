import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { cluster } from "./eks";
import { eksAddons, eksClusterName, tags } from "./variables";

for (const addon of eksAddons) {
  if (addon.enableIRSA) {
    // Create the IAM role for the EBS CSI driver
    const irsaRole = new aws.iam.Role(`${eksClusterName}-role-${addon.name}`, {
      name: `${addon.name}-sa`,
      assumeRolePolicy: pulumi.output(cluster.core.oidcProvider).apply(oidcProvider => {
        const policy = {
          Version: "2012-10-17" as const,  // Ensure 'Version' is a string literal type
          Statement: [
            {
              Action: "sts:AssumeRoleWithWebIdentity",
              Effect: "Allow",
              Principal: {
                Federated: oidcProvider?.arn || "",
              },
              Condition: {
                StringEquals: {
                  [`${oidcProvider?.url}:sub`]: `system:serviceaccount:${addon.namespace || "kube-system"}:${addon.name}-sa`,
                },
              },
            },
          ],
        };
        return JSON.stringify(policy);  // Return the policy as a JSON string
      }),
      tags: tags,
    });
    
    if (addon.name  === "aws-ebs-csi-driver"){
      new aws.iam.RolePolicyAttachment(`${eksClusterName}-policy-attachment-${addon.name}`, {
          role: irsaRole.name,
          policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
      });

      new aws.iam.RolePolicy(`${eksClusterName}-policy-attachment-${addon.name}-kms`, {
        role: irsaRole.name,
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "kms:Decrypt",
                        "kms:GenerateDataKeyWithoutPlaintext",
                        "kms:CreateGrant"
                    ],
                    Resource: "*",
                },
            ],
        }),
      });
    }
  };

  // new aws.eks.Addon(`${eksClusterName}-${addon.name}`, {
  //   addonName: addon.name,
  //   addonVersion: addon.version,
  //   clusterName: eksClusterName,
  //   configurationValues: JSON.stringify(addon?.configuration ?? {}),
  //   resolveConflictsOnCreate: "OVERWRITE",
  //   serviceAccountRoleArn: "",
  //   tags: tags,
  // });
}