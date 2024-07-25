import * as aws from "@pulumi/aws";
import * as github from "@pulumi/github";
import * as k8s from "@pulumi/kubernetes";

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

// Export the cluster's kubeconfig.
export const kubeProvider = new k8s.Provider("k8s",
  {
    kubeconfig: cluster.kubeconfig,
  },
  {
    provider: cluster.provider,
  },
);
