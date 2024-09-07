import { argoCdPrFiles } from "./argocd";
import { eksAddonsPrFiles } from "./eks-addons";
import { createGitPR } from "./helpers/git-helpers";

createGitPR(`automated-devops-pr-${Date.now()}`, 
            [
                ...argoCdPrFiles,
                ...eksAddonsPrFiles,
            ],
);
