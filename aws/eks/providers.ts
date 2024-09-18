import * as aws from "@pulumi/aws"; // AWS Pulumi SDK
import * as github from "@pulumi/github"; // GitHub Pulumi SDK
import * as kubernetes from "@pulumi/kubernetes"; // Kubernetes Pulumi SDK

import { cluster } from "./eks"; // EKS cluster resource from a local module
import { awsProfile, githubOwner, region } from "./variables"; // Configuration variables

// Configure the AWS provider
export const awsProvider = new aws.Provider("aws", {
  profile: awsProfile, // AWS profile for resource management
  region: region, // AWS region for resource deployment
});

// Configure the GitHub provider
export const githubProvider = new github.Provider("github", {
  token: process.env.GITHUB_TOKEN, // GitHub token for authentication
  owner: githubOwner, // GitHub organization or user
});

// Configure the Kubernetes provider using the EKS cluster's kubeconfig
export const k8sProvider = new kubernetes.Provider("k8s", {
  kubeconfig: cluster.kubeconfig.apply(JSON.stringify), // Convert kubeconfig to JSON string
}, {
  dependsOn: cluster, // Ensure this provider is set up after the EKS cluster is created
});
