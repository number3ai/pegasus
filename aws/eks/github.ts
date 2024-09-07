import { gitPrFilesArgoCd } from "./argocd";
import { gitPrFilesEksAddons } from "./eks-addons";
import { createGitPR } from "./helpers/git-helpers";

createGitPR(`automated-devops-pr-${Date.now()}`, 
            [
                ...gitPrFilesArgoCd,
                ...gitPrFilesEksAddons,
            ],
);
