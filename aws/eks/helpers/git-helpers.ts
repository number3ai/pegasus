/**
 * This TypeScript file is designed to automate the process of creating and managing GitHub
 * pull requests using Pulumi and the GitHub provider. It provides functions to:
 *
 * - Convert JSON objects into YAML format, encode them as base64, and commit them as files in a GitHub repository.
 * - Create new branches in a GitHub repository from a base branch.
 * - Add or overwrite files in the new branch with content generated from the converted YAML files.
 * - Create a pull request from the new branch to the main branch of the repository.
 *
 * The file uses Node.js crypto modules to generate random strings and hash values, ensuring
 * unique identifiers for branches, files, and pull requests.
 * Pulumi is used to manage resources in a declarative way and handle dependencies between the creation
 * of branches, files, and pull requests.
 *
 * The process includes:
 * - Hashing the branch name for uniqueness.
 * - Committing files to a specific path in the repository.
 * - Automatically generating a pull request with a timestamp and a predefined message.
 */

import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";
import * as yaml from "js-yaml"; // Library to handle YAML conversion

import { Buffer } from "buffer"; // Node.js built-in module for working with binary data
import { createHash, randomBytes } from "crypto"; // Node.js built-in module for hashing and generating random strings

import { githubProvider } from "../providers"; // Import custom GitHub provider
import { environment, githubOwner, githubRepository } from "../variables"; // Import environment variables

// Function to convert JSON to YAML and then encode to base64
function jsonToYamlBase64(jsonObject: object): string {
  // Convert the JSON object to YAML, then encode the YAML as a base64 string
  return Buffer.from(yaml.dump(jsonObject)).toString("base64");
}

// Function to generate a random string of a specified length
function generateRandomString(length: number): string {
  // Use crypto's randomBytes function, then convert it to a hex string and slice to the desired length
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

// Function to hash a string using SHA-1
function hashString(input: string): string {
  // Create a SHA-1 hash of the input string and return the hex digest
  return createHash("sha1").update(input).digest("hex");
}

// Define a type representing a file map with a file name and a JSON object
export type GitFileMap = {
  fileName: string;
  json: object;
};

// Process an array of Git pull request files
export function processGitPrFiles(
  gitPrFiles: Array<GitFileMap>
): Array<GitFileMap> {
  // Use Pulumi's all() method to ensure all promises are resolved (if any), then return the files
  pulumi.all(gitPrFiles).apply(() => {
    return gitPrFiles;
  });
  return gitPrFiles;
}

// Create a GitHub Pull Request with a branch and a set of files
export function createGitPR(branchName: string, files: Array<GitFileMap>) {
  const fullRepositoryName = `${githubOwner}/${githubRepository}`; // Full GitHub repository name

  // Create a new branch in the repository
  new github.Branch(
    `${hashString(branchName)}-git-branch`,
    {
      repository: fullRepositoryName,
      branch: branchName,
    },
    {
      provider: githubProvider, // Use the custom GitHub provider
    }
  );

  // Loop through each file in the files array and create a file in the GitHub repository
  for (const file of files) {
    const filePath = `/releases/${environment}/${file.fileName}.generated.yaml`; // File path in the repo

    // Add or overwrite a file in the specified branch
    new github.RepositoryFile(
      `${generateRandomString(32)}-git-file`,
      {
        branch: branchName,
        commitAuthor: "Pulumi Bot", // Author for the commit
        commitEmail: "bot@pulumi.com", // Email for the commit
        commitMessage: `Add new file to the repository: ${filePath}`, // Commit message
        content: jsonToYamlBase64(file.json), // Convert JSON to YAML and encode to base64 before adding the content
        file: filePath, // Path of the file in the repo
        overwriteOnCreate: true, // Overwrite if the file already exists
        repository: fullRepositoryName, // Target repository
      },
      {
        provider: githubProvider, // Use the custom GitHub provider
      }
    );
  }

  // Create a pull request from the branch to the main branch
  new github.RepositoryPullRequest(
    `${generateRandomString(32)}-git-pr`,
    {
      baseRef: "main", // Base branch to merge into (main branch)
      baseRepository: fullRepositoryName, // Repository name
      headRef: branchName, // Source branch (created branch)
      title: `Automated PR from devops pipeline - ${Date.now().toString()}`, // PR title with a timestamp
      body: "This PR was created automatically by the pegasus bot.", // PR description
    },
    {
      provider: githubProvider, // Use the custom GitHub provider
    }
  );
}
