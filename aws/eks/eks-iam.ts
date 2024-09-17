import * as aws from "@pulumi/aws"; // Import AWS resources from Pulumi

import { accountId } from "./variables"; // Import the AWS account ID from the variables file

// Define the policy document for EC2 volume management
const ec2CreateVolumePolicyDocument = {
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
      ],
      Resource: "*",
    },
  ],
};

// Create the IAM policy for EC2 volume management
const ec2CreateVolumePolicy = new aws.iam.Policy("ec2CreateVolumePolicy", {
  description: "Policy to allow EC2 CreateVolume action",
  name: "EC2CreateVolumePolicy",
  policy: JSON.stringify(ec2CreateVolumePolicyDocument),
});

// List of managed IAM policies to attach to the EKS worker node role
const managedPolicyArns: string[] = [
  "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
  `arn:aws:iam::${accountId}:policy/EC2CreateVolumePolicy`,
];

// Creates an IAM role and attaches the specified managed policies
export function createRole(name: string): aws.iam.Role {
  // Define the IAM Role with the 'ec2.amazonaws.com' service principal
  const role = new aws.iam.Role(name, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ec2.amazonaws.com",
    }),
  });

  // Attach each managed policy to the role
  managedPolicyArns.forEach((policy, index) => {
    new aws.iam.RolePolicyAttachment(
      `${name}-policy-${index}`,
      {
        policyArn: policy,
        role: role,
      },
      {
        dependsOn: ec2CreateVolumePolicy,
      }
    );
  });

  return role; // Return the created IAM role
}

// Creates multiple IAM roles based on the specified quantity
export function createRoles(name: string, quantity: number): aws.iam.Role[] {
  return Array.from({ length: quantity }, (_, i) => createRole(`${name}-role-${i}`));
}

// Creates IAM instance profiles for the given roles
export function createInstanceProfiles(
  name: string,
  roles: aws.iam.Role[]
): aws.iam.InstanceProfile[] {
  return roles.map((role, index) =>
    new aws.iam.InstanceProfile(`${name}-instanceProfile-${index}`, {
      role: role,
    })
  );
}
