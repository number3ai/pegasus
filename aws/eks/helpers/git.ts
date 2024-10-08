import * as github from "@pulumi/github";

import { githubProvider } from "../providers";
import { environment, githubRepository } from "../variables";
import { jsonToYaml } from "./utils";

// Define a type representing a file map with a file name and a JSON object
export type GitFileMap = {
  fileName: string;
  json: object;
};

// Create a GitHub RepositoryFile with a branch and a set of files
export function uploadValueFile(file: GitFileMap): github.RepositoryFile {
  const filePath = `releases/${environment}/${file.fileName}.generated.yaml`;

  // Add or overwrite a file in the specified branch
  return new github.RepositoryFile(
    `${filePath.replace("/", "-")}-git`,
    {
      branch: "main",
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
  );
}
