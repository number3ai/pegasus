import * as pulumi from "@pulumi/pulumi";

import { argoCdPrFiles } from "./argocd";
import { eksAddonsPrFiles } from "./eks-addons";
import { createGitPR } from "./helpers/git-helpers";

pulumi.all([eksAddonsPrFiles, argoCdPrFiles]).apply(([resolvedEksAddonsPrFiles, resolvedArgoCdPrFiles]) => {
    // Now that the Output values are resolved, you can safely spread them
    createGitPR(`automated-devops-pr-${Date.now()}`, 
                [
                    ...resolvedArgoCdPrFiles,
                    ...resolvedEksAddonsPrFiles,
                ],
    );
});

