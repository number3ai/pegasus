/* Providers
  This file sets up the providers that are used to interact with the applicable resources.
*/

import * as aws from "@pulumi/aws";
import * as github from "@pulumi/github";

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
