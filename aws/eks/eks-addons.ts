import * as pulumi from "@pulumi/pulumi";

import { argoCdPrFiles } from "./argocd";
import { createGitPR } from "./helpers/git";

const eksAddonsPrFilesPromises = [
  "amazon-cloudwatch-observability",
  "aws-load-balancer-controller",
  "ebs-csi-driver",
  "grafana",
  "ingress-nginx",
  "karpenter",
].map(addon => 
  import(`./eks-addons/${addon}`)
    .then(module => module.role?.arn ? module.role.arn.apply(() => module.valueFile) : module.valueFile)
    .catch(error => {
      console.error(`Failed to import ${addon}:`, error);
      return []; // Return an empty array in case of error
    })
);

pulumi.all([
  Promise.all(eksAddonsPrFilesPromises),
  argoCdPrFiles
]).apply(([resolvedEksAddonsPrFiles, resolvedArgoCdPrFiles]) => {
  createGitPR("automated-devops-dynamic-helm-values", [
      ...resolvedArgoCdPrFiles,
      ...resolvedEksAddonsPrFiles.flat() // Flatten the array in case of nested arrays
  ]);
});
