import * as pulumi from "@pulumi/pulumi";

import { argoCdPrFiles } from "./argocd";
import { eksAddonsPrFiles } from "./eks-addons";
import { createGitPR } from "./helpers/git-helpers";

pulumi.all([eksAddonsPrFiles, argoCdPrFiles]).apply(() => {
    createGitPR(`automated-devops-pr-${Date.now()}`, 
                [
                    ...argoCdPrFiles,
                    ...eksAddonsPrFiles,
                ],
    );
});
