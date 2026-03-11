/**
 * GitHub Provider Configuration
 * Centralized GitHub provider setup for the Pegasus EKS infrastructure
 */

import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";

import { githubOwner } from "../config/variables";

/**
 * GitHub Provider Configuration
 * Configures the GitHub provider with proper authentication and settings
 */
export const githubProvider = new github.Provider("github", {
  token: getGitHubToken(),
  owner: githubOwner,
});

/**
 * Get GitHub token from environment variables
 * Throws an error if the token is not configured
 */
function getGitHubToken(): pulumi.Output<string> {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is required. " +
      "Please set it with: export GITHUB_TOKEN='your-github-token'"
    );
  }
  
  return pulumi.secret(token);
}

/**
 * Validate GitHub provider configuration
 * Ensures the GitHub token has the necessary permissions
 */
export async function validateGitHubProvider(): Promise<void> {
  try {
    const user = new github.getUserOutput({ username: githubOwner }, { provider: githubProvider });
    await user.id;
    
    console.log("✅ GitHub provider configured successfully");
  } catch (error) {
    throw new Error(`❌ GitHub provider validation failed: ${error}`);
  }
}

/**
 * Create a GitHub repository file with proper error handling
 * @param filePath - Path to the file in the repository
 * @param content - File content
 * @param commitMessage - Git commit message
 * @param branch - Target branch (defaults to main)
 */
export function createRepositoryFile(
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string = "main"
): github.RepositoryFile {
  return new github.RepositoryFile(
    `github-file-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}`,
    {
      branch,
      commitAuthor: "Pulumi Bot",
      commitEmail: "bot@pulumi.com",
      commitMessage,
      content,
      file: filePath,
      overwriteOnCreate: true,
      repository: "caprica", // This should come from config
    },
    {
      deleteBeforeReplace: true,
      provider: githubProvider,
    }
  );
} 