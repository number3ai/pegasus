/**
 * IAM Infrastructure
 * IAM roles and policies for the Pegasus EKS infrastructure
 */

import * as aws from "@pulumi/aws";

import { eksClusterName, accountId, tags } from "../config/variables";
import { DEFAULTS } from "../config/constants";

/**
 * IAM Role Configuration Interface
 */
interface RoleConfig {
  name: string;
  description?: string;
  managedPolicies?: string[];
  customPolicies?: aws.iam.RolePolicy[];
}

/**
 * Create IAM roles for EKS worker nodes
 * @param baseName - Base name for the roles
 * @param quantity - Number of roles to create
 * @returns Array of created IAM roles
 */
export function createInstanceRoles(baseName: string, quantity: number): aws.iam.Role[] {
  return Array.from({ length: quantity }, (_, i) => 
    createRole(`${baseName}-role-${i}`)
  );
}

/**
 * Create a single IAM role with managed policies
 * @param name - Role name
 * @returns Created IAM role
 */
export function createRole(name: string): aws.iam.Role {
  const role = new aws.iam.Role(name, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ec2.amazonaws.com",
    }),
    description: `IAM role for ${name}`,
    tags: {
      ...tags,
      Name: name,
      Purpose: "EKS Worker Node",
    },
  });

  // Create custom policy for EC2 volume management
  const ec2VolumePolicy = createEC2VolumePolicy();

  // Attach managed policies
  const managedPolicyArns = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
    ec2VolumePolicy.arn,
  ];

  managedPolicyArns.forEach((policyArn, index) => {
    new aws.iam.RolePolicyAttachment(
      `${name}-policy-${index}`,
      {
        policyArn,
        role: role.name,
      },
      {
        dependsOn: ec2VolumePolicy,
      }
    );
  });

  return role;
}

/**
 * Create EC2 volume management policy
 * @returns Created IAM policy
 */
function createEC2VolumePolicy(): aws.iam.Policy {
  const policyDocument = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ec2:AttachVolume",
          "ec2:CreateTags",
          "ec2:CreateVolume",
          "ec2:DetachVolume",
          "ec2:DeleteVolume",
          "ec2:DescribeVolumes",
          "ec2:DescribeInstances",
        ],
        Resource: "*",
      },
    ],
  };

  return new aws.iam.Policy("ec2VolumeManagementPolicy", {
    description: "Policy for EC2 volume management operations",
    name: "EC2VolumeManagementPolicy",
    policy: JSON.stringify(policyDocument),
    tags: {
      ...tags,
      Purpose: "EC2 Volume Management",
    },
  });
}

/**
 * Create IAM instance profiles for the given roles
 * @param name - Base name for instance profiles
 * @param roles - Array of IAM roles
 * @returns Array of created instance profiles
 */
export function createInstanceProfiles(
  name: string,
  roles: aws.iam.Role[]
): aws.iam.InstanceProfile[] {
  return roles.map((role, index) =>
    new aws.iam.InstanceProfile(`${name}-instanceProfile-${index}`, {
      role: role.name,
      tags: {
        ...tags,
        Name: `${name}-instanceProfile-${index}`,
        Purpose: "EKS Worker Node Profile",
      },
    })
  );
}

/**
 * Create instance roles for the EKS cluster
 */
export const instanceRoles = createInstanceRoles(
  `${eksClusterName}-instance-role`,
  3
);

/**
 * Create instance profiles for the instance roles
 */
export const instanceProfiles = createInstanceProfiles(
  `${eksClusterName}-instance-profile`,
  instanceRoles
); 