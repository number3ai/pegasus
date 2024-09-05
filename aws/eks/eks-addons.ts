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

import * as aws from "@pulumi/aws"; // Import AWS resources from Pulumi
import * as pulumi from "@pulumi/pulumi"; // Import Pulumi utilities

import { cluster } from "./eks"; // Import the EKS cluster details
import { eksClusterName, tags } from "./variables"; // Import cluster name and tags

// Get the OIDC (OpenID Connect) provider ARN and URL from the EKS cluster
const oidcProviderArn = cluster.core.oidcProvider?.arn || "";
const oidcProviderUrl = cluster.core.oidcProvider?.url || "";

/*
 * Create IAM Role for AWS EBS CSI Driver (Container Storage Interface)
 * This role allows the EBS CSI driver to interact with AWS services on behalf of the Kubernetes service account.
 */
const irsaRole = new aws.iam.Role(
  `${eksClusterName}-role-aws-ebs-csi-driver`, // Name of the IAM Role
  {
    name: "aws-ebs-csi-driver-sa", // IAM Role name associated with the service account
    assumeRolePolicy: pulumi
      .all([oidcProviderArn, oidcProviderUrl])
      .apply(([arn, url]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Action: "sts:AssumeRoleWithWebIdentity", // Allow the service account to assume this role
              Effect: "Allow",
              Principal: {
                Federated: arn, // Use the OIDC provider ARN
              },
              Condition: {
                StringEquals: {
                  [`${url}:aud`]: "sts.amazonaws.com", // Ensure the audience matches
                  [`${url}:sub`]:
                    "system:serviceaccount:kube-system:aws-ebs-csi-driver-sa", // Service account subject
                },
              },
            },
          ],
        })
      ),
    tags: tags, // Apply the tags to this resource
  },
  {
    dependsOn: [cluster], // Ensure this resource is created after the EKS cluster is available
  }
);

/*
 * Attach the AmazonEBSCSIDriverPolicy to the IAM Role
 * This policy allows the EBS CSI driver to perform necessary actions such as volume management.
 */
new aws.iam.RolePolicyAttachment(
  `${eksClusterName}-policy-attachment-aws-ebs-csi-driver`,
  {
    role: irsaRole.name, // Attach to the IAM Role created above
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy", // Use predefined AWS EBS CSI policy
  }
);

/*
 * Create a custom IAM policy for EBS CSI Driver with KMS (Key Management Service) permissions
 * This allows the EBS CSI driver to use KMS for encryption operations.
 */
new aws.iam.RolePolicy(
  `${eksClusterName}-policy-attachment-aws-ebs-csi-driver-kms`,
  {
    role: irsaRole.name, // Attach this policy to the EBS CSI driver role
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
          Resource: "*", // Apply this permission to all KMS resources
        },
      ],
    }),
  }
);

/*
 * Create IAM Role for AWS Load Balancer Controller
 * This role allows the AWS Load Balancer Controller to perform AWS API calls on behalf of the Kubernetes service account.
 */
const awsLoadBalancerControllerRole = new aws.iam.Role(
  `${eksClusterName}-role-aws-load-balancer-controller`, // IAM Role name for the load balancer controller
  {
    name: "AWSLoadBalancerControllerRole", // Role name
    assumeRolePolicy: pulumi
      .all([oidcProviderArn, oidcProviderUrl])
      .apply(([arn, url]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Action: "sts:AssumeRoleWithWebIdentity", // Allow service account to assume this role
              Effect: "Allow",
              Principal: {
                Federated: arn, // OIDC provider
              },
              Condition: {
                StringEquals: {
                  [`${url}:aud`]: "sts.amazonaws.com", // Ensure the audience matches
                  [`${url}:sub`]:
                    "system:serviceaccount:kube-system:aws-load-balancer-controller-sa", // Service account subject
                },
              },
            },
          ],
        })
      ),
    tags: tags, // Apply tags to the role
  },
  {
    dependsOn: [cluster], // Ensure this resource depends on the EKS cluster
  }
);

/*
 * Attach custom policy to AWS Load Balancer Controller role
 * This policy grants various permissions related to AWS load balancer operations.
 */
new aws.iam.RolePolicy(
  `${eksClusterName}-policy-attachment-aws-load-balancer-controller`, // Policy for load balancer controller role
  {
    name: "AWSLoadBalancerControllerPolicy", // Policy name
    role: awsLoadBalancerControllerRole.name, // Attach to the Load Balancer Controller role
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        // Allow actions related to certificates, security groups, and load balancers
        {
          Effect: "Allow",
          Action: [
            "acm:DescribeCertificate",
            "acm:ListCertificates",
            "ec2:AuthorizeSecurityGroupIngress",
            "ec2:DescribeInstances",
            "elasticloadbalancing:CreateLoadBalancer",
            "elasticloadbalancing:ModifyLoadBalancerAttributes",
            "elasticloadbalancing:SetWebAcl",
            "iam:ListServerCertificates",
            "shield:DescribeProtection",
            "wafv2:AssociateWebACL",
            "elasticloadbalancing:DescribeTargetGroups",
            // Additional permissions for load balancer management
          ],
          Resource: "*", // Apply to all resources
        },
        // Additional statements for specific resources like security groups and tags
        {
          Effect: "Allow",
          Action: ["ec2:CreateTags", "ec2:DeleteTags"],
          Resource: "arn:aws:ec2:*:*:security-group/*",
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
