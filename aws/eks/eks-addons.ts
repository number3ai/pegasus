/**
 * This Pulumi code sets up IAM roles, policies, and patches for Kubernetes services such as 
 * AWS EBS CSI Driver, Cilium, and AWS Load Balancer Controller in an EKS cluster.
 * 
 * Breakdown:
 * 
 * 1. OIDC Provider:
 *    - Extracts the OIDC provider's ARN and URL from the EKS cluster to facilitate the creation of 
 *      IAM roles for service accounts.
 * 
 * 2. AWS EBS CSI Driver:
 *    - Creates an IAM role (`irsaRole`) for the AWS EBS CSI Driver, allowing the service account 
 *      `aws-ebs-csi-driver-sa` to assume the role using web identity tokens.
 *    - Attaches the `AmazonEBSCSIDriverPolicy` to this role and adds a custom IAM policy for KMS 
 *      decryption permissions.
 * 
 * 3. Cilium Service Mesh:
 *    - If `serviceMesh` is set to `cilium`, the existing `aws-node` DaemonSet in the `kube-system` 
 *      namespace is patched to add a `nodeSelector`.
 *    - Creates an IAM policy (`ciliumPolicy`) for the Cilium operator to manage EC2 network 
 *      interfaces and assigns it to a new IAM role (`ciliumRole`).
 * 
 * 4. AWS Load Balancer Controller:
 *    - Creates an IAM role (`awsLoadBalancerControllerRole`) for the AWS Load Balancer Controller, 
 *      allowing the `aws-load-balancer-controller-sa` service account to assume the role.
 *    - Attaches a detailed IAM policy for the role to manage Elastic Load Balancers (ELB), security 
 *      groups, and related AWS resources, with additional conditions for tagging resources.
 * 
 * 5. IAM Policy Attachments:
 *    - Multiple IAM policies are attached to the roles created for the various Kubernetes components 
 *      to ensure they have the correct permissions for interacting with AWS resources like EC2, ELB, 
 *      and KMS.
 * 
 * Summary:
 * This code sets up the necessary IAM roles and policies for managing AWS resources through 
 * Kubernetes services such as AWS EBS CSI Driver, Cilium, and AWS Load Balancer Controller in an 
 * EKS environment.
 */

import * as aws from "@pulumi/aws";
import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { argocd } from "./argocd";
import { cluster } from "./eks";
import { k8sProvider } from "./providers";
import { eksClusterName, serviceMesh, tags } from "./variables";

const oidcProviderArn = cluster.core.oidcProvider?.arn || "";
const oidcProviderUrl = cluster.core.oidcProvider?.url || "";

/* aws-ebs-csi-driver */
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
                  [`${url}:sub`]:
                    "system:serviceaccount:kube-system:aws-ebs-csi-driver-sa",
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
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
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

/* Cilium */
// Patching so we can setup cilium
if (serviceMesh === "cilium") {
  const namespace = "kube-system";
  const daemonsetName = "aws-node";

  // Load the existing daemonset
  const awsNodeDaemonSet = kubernetes.apps.v1.DaemonSet.get(
    "aws-node",
    `${namespace}/${daemonsetName}`,
    { 
      dependsOn: [cluster, argocd],
      provider: k8sProvider 
    }
  );

  // Update the daemonset with the new nodeSelector
  new kubernetes.apps.v1.DaemonSetPatch(
    daemonsetName,
    {
      metadata: {
        name: awsNodeDaemonSet.metadata.name,
        namespace: awsNodeDaemonSet.metadata.namespace,
      },
      spec: {
        template: {
          spec: {
            nodeSelector: {
              "io.cilium/aws-node-enabled": "true",
            },
          },
        },
      },
    },
    {
      dependsOn: [cluster, argocd],
      provider: k8sProvider,
    }
  );

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
    "ciliumRole",
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
                    [`${url}:sub`]:
                      "system:serviceaccount:kube-system:cilium-operator",
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
}

/* AWS Load Balancer Controller */
const awsLoadBalancerControllerRole = new aws.iam.Role(
  `${eksClusterName}-role-aws-load-balancer-controller`,
  {
    name: "AWSLoadBalancerControllerRole",
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
                  [`${url}:sub`]:
                    "system:serviceaccount:kube-system:aws-load-balancer-controller-sa",
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

new aws.iam.RolePolicy(
  `${eksClusterName}-policy-attachment-aws-load-balancer-controller`,
  {
    name: "AWSLoadBalancerControllerPolicy",
    role: awsLoadBalancerControllerRole.name,
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "acm:DescribeCertificate",
            "acm:ListCertificates",
            "cognito-idp:DescribeUserPoolClient",
            "ec2:AuthorizeSecurityGroupIngress",
            "ec2:CreateSecurityGroup",
            "ec2:DescribeAccountAttributes",
            "ec2:DescribeAddresses",
            "ec2:DescribeAvailabilityZones",
            "ec2:DescribeCoipPools",
            "ec2:DescribeInstanceAttribute",
            "ec2:DescribeInstances",
            "ec2:DescribeInternetGateways",
            "ec2:DescribeNetworkInterfaces",
            "ec2:DescribeSecurityGroups",
            "ec2:DescribeSubnets",
            "ec2:DescribeTags",
            "ec2:DescribeVpcPeeringConnections",
            "ec2:DescribeVpcs",
            "ec2:GetCoipPoolUsage",
            "ec2:RevokeSecurityGroupIngress",
            "elasticloadbalancing:AddListenerCertificates",
            "elasticloadbalancing:CreateListener",
            "elasticloadbalancing:CreateRule",
            "elasticloadbalancing:DeleteListener",
            "elasticloadbalancing:DeleteRule",
            "elasticloadbalancing:DescribeListenerCertificates",
            "elasticloadbalancing:DescribeListeners",
            "elasticloadbalancing:DescribeLoadBalancerAttributes",
            "elasticloadbalancing:DescribeLoadBalancers",
            "elasticloadbalancing:DescribeRules",
            "elasticloadbalancing:DescribeSSLPolicies",
            "elasticloadbalancing:DescribeTags",
            "elasticloadbalancing:DescribeTargetGroupAttributes",
            "elasticloadbalancing:DescribeTargetGroups",
            "elasticloadbalancing:DescribeTargetHealth",
            "elasticloadbalancing:DescribeTrustStores",
            "elasticloadbalancing:ModifyListener",
            "elasticloadbalancing:ModifyRule",
            "elasticloadbalancing:RemoveListenerCertificates",
            "elasticloadbalancing:SetWebAcl",
            "iam:GetServerCertificate",
            "iam:ListServerCertificates",
            "shield:CreateProtection",
            "shield:DeleteProtection",
            "shield:DescribeProtection",
            "shield:GetSubscriptionState",
            "waf-regional:AssociateWebACL",
            "waf-regional:DisassociateWebACL",
            "waf-regional:GetWebACL",
            "waf-regional:GetWebACLForResource",
            "wafv2:AssociateWebACL",
            "wafv2:DisassociateWebACL",
            "wafv2:GetWebACL",
            "wafv2:GetWebACLForResource",
          ],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: ["ec2:CreateTags"],
          Condition: {
            StringEquals: {
              "ec2:CreateAction": "CreateSecurityGroup",
            },
            Null: {
              "aws:RequestTag/elbv2.k8s.aws/cluster": "false",
            },
          },
          Resource: "arn:aws:ec2:*:*:security-group/*",
        },
        {
          Effect: "Allow",
          Action: ["ec2:CreateTags", "ec2:DeleteTags"],
          Resource: "arn:aws:ec2:*:*:security-group/*",
          Condition: {
            Null: {
              "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
              "aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "ec2:AuthorizeSecurityGroupIngress",
            "ec2:RevokeSecurityGroupIngress",
            "ec2:DeleteSecurityGroup",
          ],
          Resource: "*",
          Condition: {
            Null: {
              "aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "elasticloadbalancing:CreateLoadBalancer",
            "elasticloadbalancing:CreateTargetGroup",
          ],
          Resource: "*",
          Condition: {
            Null: {
              "aws:RequestTag/elbv2.k8s.aws/cluster": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "elasticloadbalancing:AddTags",
            "elasticloadbalancing:RemoveTags",
          ],
          Resource: [
            "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
            "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
            "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*",
          ],
          Condition: {
            Null: {
              "aws:RequestTag/elbv2.k8s.aws/cluster": "true",
              "aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "elasticloadbalancing:AddTags",
            "elasticloadbalancing:RemoveTags",
          ],
          Resource: [
            "arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*",
            "arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*",
            "arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*",
            "arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*",
          ],
        },
        {
          Effect: "Allow",
          Action: [
            "elasticloadbalancing:ModifyLoadBalancerAttributes",
            "elasticloadbalancing:SetIpAddressType",
            "elasticloadbalancing:SetSecurityGroups",
            "elasticloadbalancing:SetSubnets",
            "elasticloadbalancing:DeleteLoadBalancer",
            "elasticloadbalancing:ModifyTargetGroup",
            "elasticloadbalancing:ModifyTargetGroupAttributes",
            "elasticloadbalancing:DeleteTargetGroup",
          ],
          Resource: "*",
          Condition: {
            Null: {
              "aws:ResourceTag/elbv2.k8s.aws/cluster": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: ["elasticloadbalancing:AddTags"],
          Resource: [
            "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
            "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
            "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*",
          ],
          Condition: {
            StringEquals: {
              "elasticloadbalancing:CreateAction": [
                "CreateTargetGroup",
                "CreateLoadBalancer",
              ],
            },
            Null: {
              "aws:RequestTag/elbv2.k8s.aws/cluster": "false",
            },
          },
        },
        {
          Effect: "Allow",
          Action: [
            "elasticloadbalancing:RegisterTargets",
            "elasticloadbalancing:DeregisterTargets",
          ],
          Resource: "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
        },
      ],
    }),
  }
);
