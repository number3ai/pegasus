import * as github from "@pulumi/github";

import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

import { Buffer } from 'buffer'; // Node.js built-in module

import { environment, githubRepository } from "../variables";

// Function to convert JSON to YAML and then encode to base64
function jsonToYamlBase64(jsonObject: object): string {
  const yamlString = yaml.dump(jsonObject);
  const base64String = Buffer.from(yamlString).toString('base64');
  
  return base64String;
}

function generateRandomString(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function hashString(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export type GitFileMap = {
  fileName: string;
  json: object;
};
  
export function createGitPR(branchName: string, files: Array<GitFileMap>) {  
  // Create a new branch from the base branch
  new github.Branch(`${hashString(branchName)}-git-branch`, {  
    repository: githubRepository,
    branch: branchName
  });

  for (const file of files) {
    // Add a new file to the new branch
    new github.RepositoryFile(`${generateRandomString(40)}-git-file`, {
      repository: githubRepository,
      file: `/releases/${environment}/${file.fileName}.generated.yaml`,
      branch: branchName,
      content: jsonToYamlBase64(file.json), // Convert content to base64
      commitMessage: "Add new file",
    });
  }

  // Create a pull request from the new branch to the base branch
  const pullRequest = new github.RepositoryPullRequest("newPR", {
    repository: githubRepository,
    headRef: branchName,
    title: "Automated PR from galactica",
    body: "This PR was created automatically by the galactica bot."
  });
}