import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";

import * as yaml from 'js-yaml';

import { Buffer } from 'buffer'; // Node.js built-in module
import { createHash, randomBytes } from 'crypto';

import { environment, githubOwner, githubRepository } from "../variables";

// Function to convert JSON to YAML and then encode to base64
function jsonToYamlBase64(jsonObject: object): string {
  return Buffer.from(yaml.dump(jsonObject)).toString('base64');
}

function generateRandomString(length: number): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex')
                                           .slice(0, length);
}

function hashString(input: string): string {
  return createHash('sha1').update(input)
                           .digest('hex');
}

export type GitFileMap = {
  fileName: string;
  json: object;
};

export function processGitPrFiles(gitPrFiles: Array<GitFileMap>): Array<GitFileMap> {
  pulumi.all(gitPrFiles).apply(() => {
    return gitPrFiles;
  });
  return gitPrFiles;
}

export function createGitPR(branchName: string, files: Array<GitFileMap>) {  
  const fullRepositoryName = `${githubOwner}/${githubRepository}`;

  // Create a new branch from the base branch
  new github.Branch(`${hashString(branchName)}-git-branch`, {  
    repository: fullRepositoryName,
    branch: branchName
  });

  for (const file of files) {
    const filePath = `/releases/${environment}/${file.fileName}.generated.yaml`;

    // Add a new file to the new branch
    new github.RepositoryFile(`${generateRandomString(32)}-git-file`, {
      branch: branchName,
      commitAuthor: "Pulumi Bot", // Optional: Commit author name
      commitEmail: "bot@pulumi.com", // Optional: Commit author email
      commitMessage: `Add new file to the repository: ${filePath}`,
      content: jsonToYamlBase64(file.json),
      file: filePath,
      overwriteOnCreate: true, // Overwrite the file if it already exists
      repository: fullRepositoryName,
    });
  }

  new github.RepositoryPullRequest(`${generateRandomString(32)}-git-pr`, {
    baseRef: "main",
    baseRepository: fullRepositoryName,
    headRef: branchName,
    title: `Automated PR from devops pipeline - ${Date.now().toString()}`,
    body: "This PR was created automatically by the pegasus bot."
  });
}
