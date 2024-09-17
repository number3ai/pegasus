import * as pulumi from "@pulumi/pulumi";

import { argoCdPrFiles } from "./argocd";
import { createGitPR } from "./helpers/git";

const eksAddonsPrFiles: any = [];

[
  "amazon-cloudwatch-observability",
  "aws-load-balancer-controller",
  "ebs-csi-driver",
  "grafana",
  "ingress-nginx",
  "karpenter",
].forEach( addon => {
  import(`./eks-addons/${addon}`);
  import(`./eks-addons/${addon}`).then( module => {
    try {
      eksAddonsPrFiles.push(module.role.arn.apply(() => module.valueFile));
    } catch (error) {
      eksAddonsPrFiles.push(module.valueFile);
    }
  });
});

// Resolve all Pulumi Outputs (argoCdPrFiles and eksAddonsPrFiles) before creating the PR
pulumi.all([
  eksAddonsPrFiles,
  argoCdPrFiles
]).apply(([
  resolvedEksAddonsPrFiles, 
  resolvedArgoCdPrFiles
]) => {
  // Now that the Output values are resolved, you can safely spread them into a single array
  createGitPR("automated-devops-dynamic-helm-values", // Unique branch name based on the current timestamp
              [
                  ...resolvedArgoCdPrFiles, // Spread the resolved ArgoCD PR files
                  ...resolvedEksAddonsPrFiles, // Spread the resolved EKS Add-ons PR files
              ],
  );
});