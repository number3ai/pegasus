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


import * as aws from "@pulumi/aws";
import * as github from "@pulumi/github";
import * as kubernetes from "@pulumi/kubernetes";

import { cluster } from "./eks";
import { awsProfile, githubOwner, region } from "./variables";

// Set the AWS provider with the profile
export const awsProvider = new aws.Provider("aws", {
  profile: awsProfile,
  region: region,
});

// Set the GitHub provider
export const githubProvider = new github.Provider("github", {
  token: process.env.GITHUB_TOKEN,
  owner: githubOwner,
});

// Create a Kubernetes provider using the cluster's kubeconfig
export const k8sProvider = new kubernetes.Provider(
  "k8s",
  {
    kubeconfig: cluster.kubeconfig.apply(JSON.stringify),
  },
  {
    dependsOn: cluster,
  }
);
