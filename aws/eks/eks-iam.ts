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

import * as aws from "@pulumi/aws"; // Import AWS resources from Pulumi

import { region } from "./variables"; // Import the AWS region from the variables file

const accountId = aws.getCallerIdentity({}).then(identity => identity.accountId);

// Define the policy document
const ec2CreateVolumePolicyDocument = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: "ec2:CreateVolume",
      Resource: `arn:aws:ec2:${region}:${accountId}:volume/*`
    }
  ]
};

// Create the IAM policy
const ec2CreateVolumePolicy = new aws.iam.Policy("ec2CreateVolumePolicy", {
  description: "Policy to allow EC2 CreateVolume action",
  name: "EC2CreateVolumePolicy",
  policy: JSON.stringify(ec2CreateVolumePolicyDocument)
});

// List of managed IAM policies to attach to the EKS worker node role.
// These policies grant necessary permissions for the EKS worker nodes to interact with AWS services.
const managedPolicyArns: string[] = [
  "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy", // Allows worker nodes to communicate with the EKS cluster
  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy", // Provides permissions to manage Elastic Network Interfaces (ENIs)
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly", // Grants read-only access to ECR (Elastic Container Registry) for pulling container images
  "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy", // Allows nodes to push metrics and logs to CloudWatch
  `arn:aws:iam:${accountId}:policy/EC2CreateVolumePolicy` // Allows nodes to create EBS volumes
];

// Creates a role and attaches the EKS worker node IAM managed policies
// This function creates an IAM role for EKS worker nodes and attaches the required managed policies.
export function createRole(name: string): aws.iam.Role {
  // Define the IAM Role with the 'ec2.amazonaws.com' service principal
  const role = new aws.iam.Role(name, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: "ec2.amazonaws.com", // Allows EC2 instances (EKS nodes) to assume this role
    }),
  });

  let counter = 0;
  // Loop through each managed policy ARN and attach it to the role
  for (const policy of managedPolicyArns) {
    // Create RolePolicyAttachment to attach each policy to the role
    new aws.iam.RolePolicyAttachment(
      `${name}-policy-${counter++}`, // Name of the policy attachment
      {
        policyArn: policy, // Attach the managed policy
        role: role, // The IAM role to which the policy is attached
      }, {
        dependsOn: ec2CreateVolumePolicy
      }
    );
  }

  return role; // Return the created IAM role
}

// Creates a collection of IAM roles based on the specified quantity
// This function allows creating multiple IAM roles, which can be useful for different node groups in the EKS cluster.
export function createRoles(name: string, quantity: number): aws.iam.Role[] {
  const roles: aws.iam.Role[] = [];

  // Loop to create the specified number of roles
  for (let i = 0; i < quantity; i++) {
    // Each role is named sequentially (e.g., name-role-0, name-role-1, etc.)
    roles.push(createRole(`${name}-role-${i}`));
  }

  return roles; // Return the array of created roles
}

// Creates a collection of IAM instance profiles from the given roles
// An instance profile is required to assign an IAM role to an EC2 instance.
export function createInstanceProfiles(
  name: string,
  roles: aws.iam.Role[]
): aws.iam.InstanceProfile[] {
  const profiles: aws.iam.InstanceProfile[] = [];

  // Loop through each IAM role and create an associated instance profile
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    // Create an instance profile for the role
    profiles.push(
      new aws.iam.InstanceProfile(`${name}-instanceProfile-${i}`, {
        role: role, // Associate the role with the instance profile
      })
    );
  }

  return profiles; // Return the array of created instance profiles
}
