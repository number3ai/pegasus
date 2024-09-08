import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";
import * as yaml from "js-yaml";

import { Buffer } from "buffer";
import { createHash, randomBytes } from "crypto";

import { githubProvider } from "../providers";
import { environment, githubRepository } from "../variables";

// Function to convert JSON to YAML and then encode to base64
function jsonToYaml(jsonObject: object): string {
  return Buffer.from(yaml.dump(jsonObject)).toString("ascii");
}

// Function to generate a random string of a specified length
function generateRandomString(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

// Function to hash a string using SHA-1
function hashString(input: string): string {
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
  // Create a new branch in the repository
  new github.Branch(
    "git-branch",
    {
      repository: githubRepository,
      branch: branchName,
    },
    {
      ignoreChanges: ["*"],
      provider: githubProvider,
    }
  ).branch.apply((name) => {
    // Create an array of RepositoryFile promises
    const filePromises = files.map((file) => {
      const filePath = `releases/${environment}/${file.fileName}.generated.yaml`;

      // Add or overwrite a file in the specified branch
      return new github.RepositoryFile(
        `${filePath.replace("/", "-")}-git`,
        {
          branch: name,
          commitAuthor: "Pulumi Bot",
          commitEmail: "bot@pulumi.com",
          commitMessage: `Add new file to the repository: ${filePath}`,
          content: jsonToYaml(file.json),
          file: filePath,
          overwriteOnCreate: true,
          repository: githubRepository,
        },
        {
          ignoreChanges: ["*"],
          provider: githubProvider,
        }
      ).id; // Return the resource ID to handle promises
    });

    // Use Pulumi's all() to wait for all file commits to complete
    pulumi.all(filePromises).apply(() => {
      console.log(`Creating PR for branchName: ${branchName}`);
      console.log(`Creating PR for name: ${name}`);
      // Create a pull request from the branch to the main branch
      return new github.RepositoryPullRequest(
        "git-pr",
        {
          baseRef: "main",
          baseRepository: githubRepository,
          headRef: name,
          title: `Automated PR for release pipeline - ${Date.now().toString()}`,
          body: "This PR was created automatically by the pegasus bot.",
        },
        {
          ignoreChanges: ["*"],
          provider: githubProvider,
        }
      );
    });
  });
}
