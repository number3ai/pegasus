import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";

import { githubProvider } from "../providers";
import { environment, githubRepository } from "../variables";
import { jsonToYaml } from "./utils";

// Define a type representing a file map with a file name and a JSON object
export type GitFileMap = {
  fileName: string;
  json: object;
};

// Process an array of Git pull request files
export function processGitPrFiles(gitPrFiles: Array<GitFileMap>): Array<GitFileMap> {
  // Use Pulumi's all() method to ensure all promises are resolved (if any), then return the files
  pulumi.all(gitPrFiles).apply(() => {
    return gitPrFiles;
  });
  return gitPrFiles;
}

// Create a GitHub Pull Request with a branch and a set of files
export async function createGitPR(branchName: string, files: Array<GitFileMap>) {
  // Create a new branch in the repository
  const branch = new github.Branch(
    "git-branch",
    {
      repository: githubRepository,
      branch: branchName,
    },
    {
      deleteBeforeReplace: true, // Ensure the branch is removed from the state file after creation
      provider: githubProvider,
    }
  );


  // Create an array of RepositoryFile promises
  const filePromises = files.map((file) => {
    const filePath = `releases/${environment}/${file.fileName}.generated.yaml`;

    // Add or overwrite a file in the specified branch
    return new github.RepositoryFile(
      `${filePath.replace("/", "-")}-git`,
      {
        branch: branch.branch,
        commitAuthor: "Pulumi Bot",
        commitEmail: "bot@pulumi.com",
        commitMessage: `Add new file to the repository: ${filePath}`,
        content: jsonToYaml(file.json),
        file: filePath,
        overwriteOnCreate: true,
        repository: githubRepository,
      },
      {      
        deleteBeforeReplace: true, // Ensure the file is removed from the state file after creation
        provider: githubProvider,
      }
    ).id; // Return the resource ID to handle promises
  });

  // Use Pulumi's all() to wait for all file commits to complete
  pulumi.all(filePromises).apply(() => {
    // Create a pull request from the branch to the main branch
    return new github.RepositoryPullRequest(
      "git-pr",
      {
        baseRef: "main",
        baseRepository: githubRepository,
        headRef: branch.branch,
        title: "Automated PR for release pipeline",
        body: "This PR was created automatically by the pegasus bot.",
      },
      {
        deleteBeforeReplace: true, // Ensure the pr is removed from the state file after creation
        provider: githubProvider,
      }
    );
  });
}

