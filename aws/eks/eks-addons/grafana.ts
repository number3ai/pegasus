import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";
import * as pulumi from "@pulumi/pulumi";

import { cluster } from "../eks";
import { awsProvider } from "../providers";
import { eksClusterName, region, tags } from "../variables";
import { createIRSARole } from "../helpers/aws";
import { uploadValueFile } from "../helpers/git";

/*
 * Grafana Admin Password Setup
 * Generate a random password for the Grafana admin user.
 */
const grafanaAdminPassword = new random.RandomPassword(
  "grafana-admin-password",
  {
    length: 24, // Password length
    special: false, // Exclude special characters
    lower: true,
    upper: true,
    number: true,
  }
);

// Store ArgoCD admin password in AWS Secrets Manager for secure access
const grafanaAdminSecret = new aws.secretsmanager.Secret(
  "grafana-secret",
  {
    name: `${eksClusterName}/grafana/credentials`, // Secret name in Secrets Manager
    description: "Grafana admin credentials", // Secret description
    recoveryWindowInDays: 0, // No recovery window for secret deletion
    tags: {
      ...tags, // Add predefined tags to the secret
      ...{
        service: "grafana", // Tag with service name
        cluster: cluster.eksCluster.name, // Tag with EKS cluster name
        environment: tags.Environment, // Tag with environment name
      },
    },
  },
  {
    provider: awsProvider, // Use AWS provider
  }
);

// Create a new version of the secret with the ArgoCD credentials
new aws.secretsmanager.SecretVersion(
  "grafana-secret-version",
  {
    secretId: grafanaAdminSecret.id, // Secret ID reference
    secretString: grafanaAdminPassword.result.apply(
      (password: any) => JSON.stringify({ password, username: "admin" }) // Store password and admin username
    ),
  },
  {
    provider: awsProvider, // AWS provider configuration
  }
);

pulumi.log.info(`----------Grafana IRSA Started----------`);
createIRSARole(
  "grafana",
  "monitoring",
  ["arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"],
  []
).apply(arn => {
  pulumi.log.info(`Grafana IRSA Completed`);
  uploadValueFile({
    fileName: "grafana",
    json: {
      grafana: {
        datasources: {
          "datasources.yaml": {
            apiVersion: 1,
            datasources: [
              {
                name: "Prometheus",
                type: "prometheus",
                access: "proxy",
                url: "http://prometheus.monitoring.svc.cluster.local",
                isDefault: true,
                editable: false,
              },
              {
                name: "CloudWatch",
                type: "cloudwatch",
                access: "proxy",
                uid: "cloudwatch",
                editable: false,
                jsonData: {
                  authType: "default",
                  defaultRegion: region,
                },
              },
            ],
          },
        },
        serviceAccount: {
          annotations: {
            "eks.amazonaws.com/role-arn": arn,
          },
        },
        // admin: {
        //   existingSecret: "grafana-credentials",
        //   userKey: "username",
        //   passwordKey: "password",
        // },
      },
    },
  });
});
