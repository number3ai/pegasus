/**
 * This Pulumi code creates IAM roles and instance profiles for EKS worker nodes.
 * It also attaches managed AWS IAM policies to these roles to allow EKS nodes 
 * to interact with AWS resources.
 * 
 * Breakdown:
 * 
 * 1. Managed Policies:
 *    - `managedPolicyArns` is a list of IAM managed policies including:
 *      - `AmazonEKSWorkerNodePolicy`: Grants permissions for EKS worker nodes.
 *      - `AmazonEKS_CNI_Policy`: Enables the use of the Amazon VPC CNI plugin for Kubernetes.
 *      - `AmazonEC2ContainerRegistryReadOnly`: Grants read-only access to Amazon ECR.
 *      - `CloudWatchAgentServerPolicy`: Allows nodes to send logs and metrics to CloudWatch.
 * 
 * 2. `createRole` function:
 *    - This function creates an IAM role for EKS worker nodes, allowing EC2 instances to assume 
 *      the role via `assumeRolePolicy` for the `ec2.amazonaws.com` service.
 *    - It iterates through the `managedPolicyArns` array, creating a `RolePolicyAttachment` 
 *      for each managed policy and attaches it to the role.
 * 
 * 3. `createRoles` function:
 *    - This function creates multiple IAM roles based on the given quantity.
 *    - It calls `createRole` for each role, appending a unique index to the role name.
 * 
 * 4. `createInstanceProfiles` function:
 *    - This function creates an IAM instance profile for each role in the given `roles` array.
 *    - Instance profiles are associated with EC2 instances, and each profile is linked to 
 *      a specific IAM role.
 * 
 * Summary:
 * This code simplifies the creation of IAM roles and instance profiles for EKS worker nodes, 
 * ensuring that the correct AWS policies are attached for secure and efficient operation 
 * of the Kubernetes cluster on AWS.
 */

import * as aws from "@pulumi/aws";

// List of managed IAM policies to attach to the EKS worker node role.
const managedPolicyArns: string[] = [
  "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
];

// Creates a role and attaches the EKS worker node IAM managed policies
export function createRole(name: string): aws.iam.Role {
  const role = new aws.iam.Role(name, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ec2.amazonaws.com",
    }),
  });

  let counter = 0;
  for (const policy of managedPolicyArns) {
    // Create RolePolicyAttachment without returning it.
    const rpa = new aws.iam.RolePolicyAttachment(
      `${name}-policy-${counter++}`,
      {
        policyArn: policy,
        role: role,
      }
    );
  }

  return role;
}

// Creates a collection of IAM roles.
export function createRoles(name: string, quantity: number): aws.iam.Role[] {
  const roles: aws.iam.Role[] = [];

  for (let i = 0; i < quantity; i++) {
    roles.push(createRole(`${name}-role-${i}`));
  }

  return roles;
}

// Creates a collection of IAM instance profiles from the given roles.
export function createInstanceProfiles(
  name: string,
  roles: aws.iam.Role[]
): aws.iam.InstanceProfile[] {
  const profiles: aws.iam.InstanceProfile[] = [];

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    profiles.push(
      new aws.iam.InstanceProfile(`${name}-instanceProfile-${i}`, {
        role: role,
      })
    );
  }

  return profiles;
}
