/**
 * This file sets up the providers used to interact with the applicable cloud resources and services.
 *
 * Breakdown:
 *
 * 1. AWS Provider:
 *    - Configures the AWS provider for Pulumi to interact with AWS resources.
 *    - Uses the `awsProfile` and `region` variables to define the AWS account and region.
 *    - This provider is essential for managing AWS services such as EKS, IAM, and VPC.
 *
 * 2. GitHub Provider:
 *    - Configures the GitHub provider for Pulumi to interact with GitHub repositories and other GitHub-related resources.
 *    - Uses the environment variable `GITHUB_TOKEN` for authentication and the `githubOwner` variable to specify the GitHub organization or user.
 *    - This provider may be used for managing repositories, teams, or workflow configurations.
 *
 * 3. Kubernetes Provider:
 *    - Configures the Kubernetes provider using the kubeconfig from the EKS cluster.
 *    - The provider allows Pulumi to interact with Kubernetes resources such as Deployments, Services, and ConfigMaps.
 *    - The `dependsOn` option ensures that this provider is set up only after the EKS cluster is fully created.
 *
 * Summary:
 * This file initializes the necessary providers (AWS, GitHub, and Kubernetes) to manage resources across AWS, GitHub, and Kubernetes clusters.
 * The providers enable Pulumi to create, update, and manage resources in these platforms.
 */

import * as aws from "@pulumi/aws"; // Import AWS Pulumi SDK
import * as github from "@pulumi/github"; // Import GitHub Pulumi SDK
import * as kubernetes from "@pulumi/kubernetes"; // Import Kubernetes Pulumi SDK

import { cluster } from "./eks"; // Import the EKS cluster resource from a local module
import { awsProfile, githubOwner, region } from "./variables"; // Import necessary variables

// Set the AWS provider with the specified profile and region.
// The `aws.Provider` configures AWS interactions for resources that use this provider.
export const awsProvider = new aws.Provider("aws", {
  profile: awsProfile, // Use the specified AWS profile from the configuration
  region: region, // Use the specified AWS region for resource deployment
});

// Set the GitHub provider.
// The `github.Provider` is used for managing GitHub resources (e.g., repositories, workflows).
export const githubProvider = new github.Provider("github", {
  token: process.env.GITHUB_TOKEN, // GitHub token is retrieved from environment variables for authentication
  owner: githubOwner, // GitHub owner is specified (organization or user managing the repository)
});

// Create a Kubernetes provider using the cluster's kubeconfig.
// The `kubernetes.Provider` is required to interact with the Kubernetes cluster.
export const k8sProvider = new kubernetes.Provider(
  "k8s", // Name of the provider
  {
    kubeconfig: cluster.kubeconfig.apply(JSON.stringify), // Convert the EKS cluster's kubeconfig to a JSON string
  },
  {
    dependsOn: cluster, // Ensure that the Kubernetes provider depends on the creation of the EKS cluster
  }
);
