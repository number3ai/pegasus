import * as pulumi from "@pulumi/pulumi";

import { argoCdPrFiles } from "./argocd";
import { processGitPrFiles, uploadValuesFile } from "./helpers/git";

const eksAddonsPrFilesPromises = [
  "amazon-cloudwatch-observability",
  "aws-load-balancer-controller",
  "ebs-csi-driver",
  "grafana",
  "ingress-nginx",
  "karpenter",
].map(addon => 
  import(`./eks-addons/${addon}`)
    .then(module => module.role?.arn ? module.role.arn.apply(() => processGitPrFiles([module.valueFile])) : processGitPrFiles([module.valueFile]))
    .catch(error => {
      console.error(`Failed to import ${addon}:`, error);
      return []; // Return an empty array in case of error
    })
);

pulumi.all([
  Promise.all(eksAddonsPrFilesPromises),
  argoCdPrFiles
]).apply(([resolvedEksAddonsPrFiles, resolvedArgoCdPrFiles]) => {
  uploadValuesFile([
      ...resolvedArgoCdPrFiles,
      ...resolvedEksAddonsPrFiles.flat() // Flatten the array in case of nested arrays
  ]);
});
