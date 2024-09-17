import * as pulumi from "@pulumi/pulumi";

import * as fs from 'fs';
import * as path from 'path';

import { argoCdPrFiles } from "./argocd";
import { processGitPrFiles, uploadValuesFile } from "./helpers/git";

const directoryPath = './eks-addons'; 
const files = fs.readdirSync(directoryPath);

// Output the file names
const eksAddonsPrFilesPromises = files.map(file => {
  if (!file.endsWith('.ts')) {
    return;
  }

  const addon = file.replace('.ts', '');
  
  import(`./eks-addons/${addon}`)
    .then(module => {
      return processGitPrFiles([module.addon.valueFile]);
    });
});

pulumi.all([
  Promise.all(eksAddonsPrFilesPromises),
  argoCdPrFiles
]).apply(([resolvedEksAddonsPrFiles, resolvedArgoCdPrFiles]) => {
  uploadValuesFile([
      ...resolvedArgoCdPrFiles,
      ...resolvedEksAddonsPrFiles.flat() // Flatten the array in case of nested arrays
  ]);
});
