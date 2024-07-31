import * as aws from "@pulumi/aws";
import * as iam from "@pulumi/aws-iam";

import { cluster } from "./eks";
import { eksAddons, eksClusterName, tags } from "./variables";

for (const addon of eksAddons) {
    if (addon.enableIRSA ) {
        const roleForServiceAccountsEks = new iam.RoleForServiceAccountsEks("aws-iam-example-role-for-service-accounts-eks", {
            role: {
                name: addon.name
            },
            tags: tags,
            oidcProviders: {
                main: {
                    providerArn: cluster.core.oidcProvider?.url,
                    namespaceServiceAccounts: ["default:my-app", "canary:my-app"],
                }
            },
            policies: {
                vpnCni: {
                    attach: true,
                    enableIpv4: true,
                },
            },
        });
    }

    new aws.eks.Addon(`${eksClusterName}-${addon.name}`, {
        addonName: addon.name,
        addonVersion: addon.version,
        clusterName: eksClusterName,
        configurationValues: JSON.stringify(addon?.configuration ?? {}),
        resolveConflictsOnCreate: "OVERWRITE",
        serviceAccountRoleArn: "",
        tags: tags,
    });
}