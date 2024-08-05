/* EKS IAM
    -------
    This file contains the setup for the EKS IAM roles and policies. This should include
    any IRSA roles, IAM policies, or other resources needed to support the EKS cluster.
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
      role: role 
    });
  };

  return role;
};

// Creates a collection of IAM roles.
export function createRoles(name: string, quantity: number): aws.iam.Role[] {
  const roles: aws.iam.Role[] = [];

  for (let i = 0; i < quantity; i++) {
    roles.push(createRole(`${name}-role-${i}`));
  }

  return roles;
};

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
  };

  return profiles;
}
