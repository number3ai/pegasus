import * as aws from "@pulumi/aws";
import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { argocd } from "./argocd";
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
                  [`${url}:sub`]: "system:serviceaccount:kube-system:aws-ebs-csi-driver-sa",
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

// Patching so we can setup cilium
const namespace = "kube-system";
const daemonsetName = "aws-node";

// Load the existing daemonset
const awsNodeDaemonSet = kubernetes.apps.v1.DaemonSet.get("aws-node", `${namespace}/${daemonsetName}`);

// Update the daemonset with the new nodeSelector
new kubernetes.apps.v1.DaemonSetPatch(daemonsetName, {
  metadata: {
    name: awsNodeDaemonSet.metadata.name,
    namespace: awsNodeDaemonSet.metadata.namespace,
  },
  spec: {
    template: {
      spec: {
        nodeSelector: {
          "io.cilium/aws-node-enabled": "true"
        }
      }
    }
  }
},
{
  dependsOn: [
    cluster,
    argocd,
  ]
});

// Create an IAM Policy for Cilium Operator
const ciliumPolicy = new aws.iam.Policy("ciliumPolicy", {
  description: "Policy for Cilium Operator",
  name: "CiliumOperatorPolicy",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ec2:AssignPrivateIpAddresses",
          "ec2:AttachNetworkInterface",
          "ec2:CreateNetworkInterface",
          "ec2:CreateTags",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeTags",
          "ec2:DescribeVpcs",
          "ec2:DetachNetworkInterface",
          "ec2:ModifyNetworkInterfaceAttribute",
          "ec2:UnassignPrivateIpAddresses",
        ],
        Resource: "*",
      },
    ],
  }),
});

const ciliumRole = new aws.iam.Role(
  `ciliumRole`,
  {
    name: "CiliumOperatorRole",
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
                  [`${url}:sub`]: "system:serviceaccount:kube-system:cilium-operator",
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

// Attach the IAM Policy to the IAM Role
new aws.iam.RolePolicyAttachment("ciliumPolicyAttachment", {
  policyArn: ciliumPolicy.arn,
  role: ciliumRole.name,
});
