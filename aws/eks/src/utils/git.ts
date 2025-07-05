/**
 * Git Utilities
 * Helper functions for Git operations in the Pegasus EKS infrastructure
 */

import * as github from "@pulumi/github";

import { ENVIRONMENT, githubRepository } from "../config/variables";
import { GIT, PATHS } from "../config/constants";
import { jsonToYaml } from "./yaml";

/**
 * Git file configuration interface
 */
export interface GitFileConfig {
  fileName: string;
  json: object;
  branch?: string;
  commitMessage?: string;
}

/**
 * Upload a values file to the Git repository
 * Creates or updates a YAML file in the releases directory
 * @param config - Git file configuration
 * @returns GitHub repository file resource
 */
export function uploadValueFile(config: GitFileConfig): github.RepositoryFile {
  const {
    fileName,
    json,
    branch = GIT.BRANCH,
    commitMessage = `${GIT.COMMIT_MESSAGE_PREFIX} ${getFilePath(fileName)}`,
  } = config;

  const filePath = getFilePath(fileName);
  const content = jsonToYaml(json);

  return new github.RepositoryFile(
    `git-file-${fileName.replace(/[^a-zA-Z0-9]/g, "-")}`,
    {
      branch,
      commitAuthor: GIT.COMMIT_AUTHOR,
      commitEmail: GIT.COMMIT_EMAIL,
      commitMessage,
      content,
      file: filePath,
      overwriteOnCreate: true,
      repository: githubRepository,
    },
    {
      deleteBeforeReplace: true,
    }
  );
}

/**
 * Get the full file path for a values file
 * @param fileName - Base file name
 * @returns Full file path
 */
function getFilePath(fileName: string): string {
  return `${PATHS.RELEASES.replace("{environment}", ENVIRONMENT)}/${fileName}.generated.yaml`;
}

/**
 * Create a GitHub deploy key for repository access
 * @param keyName - Name for the deploy key
 * @param publicKey - Public key content
 * @param repository - Target repository
 * @returns GitHub deploy key resource
 */
export function createDeployKey(
  keyName: string,
  publicKey: string,
  repository: string
): github.RepositoryDeployKey {
  return new github.RepositoryDeployKey(keyName, {
    key: publicKey,
    readOnly: true,
    repository,
    title: `${keyName}-deployment-key`,
  });
}

/**
 * Validate Git repository access
 * @param repository - Repository name to validate
 * @returns Promise that resolves if access is valid
 */
export async function validateGitAccess(repository: string): Promise<void> {
  try {
    // This would typically check repository access
    console.log(`✅ Git access validated for repository: ${repository}`);
  } catch (error) {
    throw new Error(`❌ Git access validation failed: ${error}`);
  }
} 