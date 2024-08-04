import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { cluster } from "./eks";
import { eksClusterName, tags } from "./variables";

const oidcProviderArn = cluster.core.oidcProvider?.arn || "";
const oidcProviderUrl = cluster.core.oidcProvider?.url || "";

// aws-ebs-csi-driver
const irsaRole = new aws.iam.Role(
  `${eksClusterName}-role-aws-ebs-csi-driver`,
  {
    name: "aws-ebs-csi-driver-sa",
    assumeRolePolicy: pulumi
      .all([oidcProviderArn, oidcProviderUrl])
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
                  [`${url}:sub`]: `system:serviceaccount:kube-system:aws-ebs-csi-driver-sa`,
                },
              },
            },
          ],
        })
      ),
    tags: tags,
  },
  {
    dependsOn: [cluster],
  }
);

new aws.iam.RolePolicyAttachment(
  `${eksClusterName}-policy-attachment-aws-ebs-csi-driver`,
  {
    role: irsaRole.name,
    policyArn:
      "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
  }
);

new aws.iam.RolePolicy(
  `${eksClusterName}-policy-attachment-aws-ebs-csi-driver-kms`,
  {
    role: irsaRole.name,
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "kms:Decrypt",
            "kms:GenerateDataKeyWithoutPlaintext",
            "kms:CreateGrant",
          ],
          Resource: "*",
        },
      ],
    }),
  }
);
