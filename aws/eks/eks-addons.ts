import * as aws from "@pulumi/aws";

import { awsProvider } from "./providers";
import { eksAddons, eksClusterName, region, tags } from "./variables";

for (const addon of eksAddons) {
    new aws.eks.Addon(`${eksClusterName}-${addon.name}`, {
        clusterName: eksClusterName,
        addonName: addon.name,
        addonVersion: addon.version,
        resolveConflictsOnCreate: "OVERWRITE",
        configurationValues: JSON.stringify(addon?.configuration ?? {}),
        tags: tags,
    },{
        provider: awsProvider,
    });
}