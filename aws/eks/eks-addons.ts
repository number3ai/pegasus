import * as pulumi from "@pulumi/pulumi";
import * as fs from 'fs';

import { argoCdPrFiles } from "./argocd";
import { processGitPrFiles, uploadValuesFile } from "./helpers/git";

const directoryPath = './eks-addons'; 
const files = fs.readdirSync(directoryPath);

// Process the files asynchronously
const eksAddonsPrFiles = files
  .filter(file => file.endsWith('.ts')) // Only process TypeScript files
  .map(async file => {
    const addon = file.replace('.ts', '');
    
    // Dynamically import the module and process the PR files
    const module = await import(`./eks-addons/${addon}`);
    return processGitPrFiles([module.addon.valueFile]);
  });

// Wait for all eksAddonsPrFiles to be resolved
Promise.all(eksAddonsPrFiles)
  .then(resolvedEksAddonsPrFiles => {
    pulumi.all([argoCdPrFiles, resolvedEksAddonsPrFiles]).apply(([resolvedArgoCdPrFiles, eksAddonsResults]) => {
      // Flatten the array of results and upload the values file
      uploadValuesFile([
        ...resolvedArgoCdPrFiles,
        ...eksAddonsResults.flat() // Flatten the array in case of nested arrays
      ]);
    });
  })
  .catch(error => {
    console.error("Error processing EKS Addon PR files:", error);
  });
