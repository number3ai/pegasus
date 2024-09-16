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
 *    - Creates an IAM role (`awsEbsCsiDriverIrsaRole`) for the AWS EBS CSI Driver, allowing the service account
 *      `aws-ebs-csi-driver-sa` to assume the role using web identity tokens.
 *    - Attaches the `AmazonEBSCSIDriverPolicy` to this role and adds a custom IAM policy for KMS
 *      decryption permissions.
 *
 * 3. Cilium Service Mesh:
 *    - If `serviceMesh` is set to `cilium`, patches the existing `aws-node` DaemonSet in the `kube-system`
 *      namespace to add a `nodeSelector`.
 *    - Creates an IAM policy (`ciliumPolicy`) for the Cilium operator to manage EC2 network
 *      interfaces and assigns it to a new IAM role (`ciliumRole`).
 *
 * 4. AWS Load Balancer Controller:
 *    - Creates an IAM role (`awsLoadBalancerControllerRole`) for the AWS Load Balancer Controller,
 *      allowing the `aws-load-balancer-controller-sa` service account to assume the role.
 *    - Attaches a detailed IAM policy to this role to manage Elastic Load Balancers (ELB), security
 *      groups, and related AWS resources, with additional conditions for tagging resources.
 *
 * 5. IAM Policy Attachments:
 *    - Attaches multiple IAM policies to the roles created for various Kubernetes components
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
import * as random from "@pulumi/random"; // Import the random password generator

import { wildcardCertificate } from "./dns"; // Import the wildcard SSL/TLS certificate
import { cluster, eksVpc } from "./eks"; // Import the EKS cluster details
import { awsProvider } from "./providers"; // Import the AWS provider
import { accountId, eksClusterName, environment, region, tags } from "./variables"; // Import cluster name and tags
import { GitFileMap, processGitPrFiles } from "./helpers/git"; // Import the createGitPR function

// Get the OIDC (OpenID Connect) provider ARN and URL from the EKS cluster
const oidcProviderArn = cluster.core.oidcProvider?.arn || "";
const oidcProviderUrl = cluster.core.oidcProvider?.url || "";

export const gitPrFiles = new Array<GitFileMap>();

/*
 * Create IAM Role for AWS EBS CSI Driver (Container Storage Interface)
 * This role allows the EBS CSI driver to interact with AWS services on behalf of the Kubernetes service account.
 */
const awsEbsCsiDriverIrsaRole = new aws.iam.Role(
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
    role: awsEbsCsiDriverIrsaRole.name, // Attach to the IAM Role created above
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
    role: awsEbsCsiDriverIrsaRole.name, // Attach this policy to the EBS CSI driver role
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

awsEbsCsiDriverIrsaRole.arn.apply((arn) => {
  
  return; // Ensure the apply callback returns nothing (void)
});

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

/* Karpenter Configuration */
export const karpenterIrsaRole = new aws.iam.Role(
  `${eksClusterName}-role-karpenter`, // Name of the IAM Role
  {
    name: "karpenter-sa", // IAM Role name associated with the service account
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
                    "system:serviceaccount:kube-system:karpenter-sa", // Service account subject
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

new aws.iam.RolePolicy(
  `${eksClusterName}-policy-attachment-karpenter`,
  {
    role: karpenterIrsaRole.name, // Attach this policy to the EBS CSI driver role
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: [
            "ec2:DescribeAvailabilityZones",
            "ec2:DescribeImages",
            "ec2:DescribeInstances",
            "ec2:DescribeInstanceTypeOfferings",
            "ec2:DescribeInstanceTypes",
            "ec2:DescribeLaunchTemplates",
            "ec2:DescribeSecurityGroups",
            "ec2:DescribeSpotPriceHistory",
            "ec2:DescribeSubnets",
            "ec2:TerminateInstances",
            "eks:DescribeCluster",
            "iam:AddRoleToInstanceProfile",
            "iam:CreateInstanceProfile",
            "iam:DeleteInstanceProfile",
            "iam:GetInstanceProfile",
            "iam:PassRole",
            "iam:RemoveRoleFromInstanceProfile",
            "iam:TagInstanceProfile",
            "pricing:GetProducts",
            "ssm:GetParameter",
          ],
          Resource: "*", // Apply this permission to all KMS resources
        },{
          Effect: "Allow",
          Action: [
            "ec2:CreateFleet",
            "ec2:CreateLaunchTemplate",
            "ec2:CreateTags",
            "ec2:DeleteLaunchTemplate",
            "ec2:RunInstances"
          ],
          Resource: [
            `arn:aws:ec2:${region}:${accountId}:*`,
            `arn:aws:ec2:${region}::image/*`,
          ]
        },
      ],
    }),
  }
);

/* Grafana Configuration */
/*
 * Grafana Admin Password Setup
 * Generate a random password for the Grafana admin user.
 */
const grafanaAdminPassword = new random.RandomPassword("grafana-admin-password", {
  length: 24, // Password length
  special: false, // Exclude special characters
  lower: true,
  upper: true,
  number: true,
});

// Store ArgoCD admin password in AWS Secrets Manager for secure access
const grafanaAdminSecret = new aws.secretsmanager.Secret(
  "grafana-secret",
  {
    name: `${eksClusterName}/grafana/credentials`, // Secret name in Secrets Manager
    description: "Grafana admin credentials", // Secret description
    recoveryWindowInDays: 0, // No recovery window for secret deletion
    tags: tags, // Add predefined tags to the secret
  },
  {
    provider: awsProvider, // Use AWS provider
  }
);

// Create a new version of the secret with the ArgoCD credentials
new aws.secretsmanager.SecretVersion(
  "grafana-secret-version",
  {
    secretId: grafanaAdminSecret.id, // Secret ID reference
    secretString: grafanaAdminPassword.result.apply(
      (password: any) => JSON.stringify({ password, username: "admin" }) // Store password and admin username
    ),
  },
  {
    provider: awsProvider, // AWS provider configuration
  }
);

export const grafanaIrsaRole = new aws.iam.Role(
  `${eksClusterName}-role-grafana`, // Name of the IAM Role
  {
    name: "grafana-sa", // IAM Role name associated with the service account
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
                    "system:serviceaccount:monitoring:grafana-sa", // Service account subject
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

new aws.iam.RolePolicyAttachment(
  `${eksClusterName}-policy-attachment-grafana`,
  {
    role: grafanaIrsaRole.name, // Attach to the IAM Role created above
    policyArn: "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess", // Use predefined Cloudwatch Policy
  }
);

/* Dynamic Helm Values */
export const eksAddonsPrFiles = pulumi
  .all([
    awsEbsCsiDriverIrsaRole.arn, 
    awsLoadBalancerControllerRole.arn,
    grafanaIrsaRole.arn, 
    karpenterIrsaRole.arn,
    wildcardCertificate.arn,
  ])
  .apply(() => {

    /* Define configurations for Amazon EBS CSI Driver */
    gitPrFiles.push({
      fileName: "aws-ebs-csi-driver",
      json: {
        "aws-ebs-csi-driver": {
          controller: {
            serviceAccount: {
              annotations: {
                "eks.amazonaws.com/role-arn": awsEbsCsiDriverIrsaRole.arn,
              },
            },
          },
        },
      },
    });

    /* Define configurations for Amazon CloudWatch observability */
    gitPrFiles.push({
      fileName: "amazon-cloudwatch-observability",
      json: {
        "amazon-cloudwatch-observability": {
          clusterName: environment,
          region: region,
        },
      },
    });

    /* Define Karpenter configuration settings */
    gitPrFiles.push({
      fileName: "karpenter",
      json: {
        karpenter: {
          settings: {
            clusterName: environment,
          },
          serviceAccount: {
            name: "karpenter-sa",
            annotations: {
              "eks.amazonaws.com/role-arn": karpenterIrsaRole.arn,
            }
          },
          defaultProvisioner: {
            requirements: [
              {
                key: "node.kubernetes.io/instance-type",
                operator: "In",
                values: [
                  "t3.medium", 
                  "t3.large"
                ],
              },
            ]
          }
        },
      },
    });

    /* Configure Ingress-NGINX with ALB (Application Load Balancer) settings */
    gitPrFiles.push({
      fileName: "ingress-nginx",
      json: {
        "ingress-nginx": {
          controller: {
            service: {
              annotations: {
                "alb.ingress.kubernetes.io/actions.ssl-redirect": JSON.stringify({
                  Type: "redirect",
                  RedirectConfig: {
                    Protocol: "HTTPS",
                    Port: "443",
                    StatusCode: "HTTP_301",
                  },
                }),
                "alb.ingress.kubernetes.io/backend-protocol": "HTTPS",
                "alb.ingress.kubernetes.io/certificate-arn": wildcardCertificate.arn,
                "alb.ingress.kubernetes.io/listen-ports": JSON.stringify([
                  { HTTP: 80 },
                  { HTTPS: 443 },
                ]),
                "alb.ingress.kubernetes.io/proxy-body-size": "0",
                "alb.ingress.kubernetes.io/scheme": "internal",
                "alb.ingress.kubernetes.io/ssl-policy":
                  "ELBSecurityPolicy-FS-1-2-Res-2020-10",
                "alb.ingress.kubernetes.io/ssl-redirect": "443",
                "alb.ingress.kubernetes.io/target-type": "ip",
                "kubernetes.io/ingress.class": "alb",
                "service.beta.kubernetes.io/aws-load-balancer-backend-protocol":
                  "http",
                "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout":
                  "3600",
                "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": wildcardCertificate.arn,
                "service.beta.kubernetes.io/aws-load-balancer-ssl-ports": "https",
              },
            },
          },
        },
      },
    });

    /* AWS Load Balancer Controller Configuration */
    gitPrFiles.push({
      fileName: "aws-load-balancer-controller",
      json: {
        "aws-load-balancer-controller": {
          clusterName: environment,
          region: region,
          serviceAccount: {
            annotations: {
              "eks.amazonaws.com/role-arn": awsLoadBalancerControllerRole.arn,
            },
          },
          vpcId: eksVpc.vpcId,
        },
      },
    });
    
    /* Grafana Configuration */
    gitPrFiles.push({
      fileName: "grafana",
      json: {
        grafana: {
          datasources: {
            "datasources.yaml": {
              apiVersion: 1,
              datasources: [
                {
                  name: "Prometheus",
                  type: "prometheus",
                  access: "proxy",
                  url: "http://prometheus.monitoring.svc.cluster.local",
                  isDefault: true,
                  editable: false,
                },
                {
                  name: "CloudWatch",
                  type: "cloudwatch",
                  access: "proxy",
                  uid: "cloudwatch",
                  editable: false,
                  jsonData: {
                    authType: "default",
                    defaultRegion: `${region}`,
                  },
                },
              ],
            },
          },
          serviceAccount: {
            labels: {
              "eks.amazonaws.com/role-arn": grafanaIrsaRole.arn,
            },
          },
          admin: {
            existingSecret: grafanaAdminSecret.name,
            userKey: "user",
            passwordKey: "password",
          },
        },
      },
    });

    // Process the git PR files after both ARNs are resolved
    return processGitPrFiles(gitPrFiles);
  });
