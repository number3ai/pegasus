/**
 * This TypeScript file is responsible for orchestrating the automated creation of a GitHub
 * pull request (PR) that contains changes from multiple sources in the context of a DevOps pipeline.
 *
 * The file leverages Pulumi to handle asynchronous resource management and ensures that the necessary
 * files from different modules (e.g., ArgoCD and EKS Add-ons) are resolved before creating the PR.
 *
 * The key steps in this process include:
 * - Collecting PR files from the ArgoCD and EKS Add-ons components.
 * - Using Pulumi's `all()` function to resolve asynchronous values for those files.
 * - Combining the resolved PR files into a single array and passing them to the `createGitPR` function.
 * - Automatically generating a unique branch name for the PR based on the current timestamp.
 *
 * This approach ensures that changes from different modules are aggregated and committed to a single
 * PR, streamlining the DevOps pipeline for automated infrastructure updates.
 */

import * as pulumi from "@pulumi/pulumi"; // Pulumi library for managing cloud resources

import { argoCdPrFiles } from "./argocd"; // ArgoCD PR files to be included in the PR
import { eksAddonsPrFiles } from "./eks-addons"; // EKS Add-ons PR files to be included in the PR
import { createGitPR, hashString } from "./helpers/git-helpers"; // Function to create the GitHub PR

// Resolve all Pulumi Outputs (argoCdPrFiles and eksAddonsPrFiles) before creating the PR
pulumi.all([eksAddonsPrFiles, argoCdPrFiles]).apply(([resolvedEksAddonsPrFiles, resolvedArgoCdPrFiles]) => {
  // Now that the Output values are resolved, you can safely spread them into a single array
  createGitPR(`automated-devops-pr-${hashString(Date.now())}`, // Unique branch name based on the current timestamp
              [
                  ...resolvedArgoCdPrFiles, // Spread the resolved ArgoCD PR files
                  ...resolvedEksAddonsPrFiles, // Spread the resolved EKS Add-ons PR files
              ],
  );
});
