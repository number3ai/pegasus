import * as aws from "@pulumi/aws"; // Import AWS-related resources from Pulumi
import * as github from "@pulumi/github"; // Import GitHub-related resources from Pulumi
import * as kubernetes from "@pulumi/kubernetes"; // Import Kubernetes-related resources from Pulumi
import * as random from "@pulumi/random"; // Import random generation utilities from Pulumi
import * as tls from "@pulumi/tls"; // Import TLS-related resources from Pulumi

import { awsProvider, githubProvider, k8sProvider } from "../providers"; // Import provider configurations
import {
  argoCdAppsVersion,
  argoCdVersion,
  dnsPublicDomain,
  eksClusterName,
  environment,
  githubOwner,
  githubBootloaderPath,
  githubBootloaders,
  githubRepository,
  tags,
} from "../variables"; // Import necessary variables
import { uploadValueFile } from "../helpers/git"; // Import the createGitPR function

// Construct GitHub repository URL
const githubRepositoryUrl = `git@github.com:${githubOwner}/${githubRepository}.git`;

/*
 * GitHub Deployment Key Setup
 * Generate an ED25519 SSH private key for authenticating the EKS cluster with the GitHub repository.
 */
const repositoryDeployKey = new tls.PrivateKey("eks-cluster-deploy-key", {
  algorithm: "ED25519", // Algorithm for SSH key generation
});

// Register the SSH key as a GitHub deploy key in the specified repository
new github.RepositoryDeployKey(
  `${eksClusterName}-eks-cluster-deploy-key`,
  {
    key: repositoryDeployKey.publicKeyOpenssh, // Public key for deployment
    readOnly: true, // Restrict access to read-only
    repository: githubRepository, // Target GitHub repository
    title: `${eksClusterName}-eks-cluster-deployment-key`, // Deploy key name in GitHub
  },
  {
    provider: githubProvider, // Use the configured GitHub provider
  }
);

/*
 * ArgoCD Admin Password Setup
 * Generate a random password for the ArgoCD admin user.
 */
const argoAdminPassword = new random.RandomPassword("argocd-admin-password", {
  length: 24, // Password length
  special: false, // Exclude special characters
  lower: true,
  upper: true,
  number: true,
});

// Store ArgoCD admin password in AWS Secrets Manager for secure access
const secret = new aws.secretsmanager.Secret(
  "argocd-secret",
  {
    name: `${eksClusterName}/argocd/credentials`, // Secret name in Secrets Manager
    description: "ArgoCD admin credentials", // Secret description
    recoveryWindowInDays: 0, // No recovery window for secret deletion
    tags: tags, // Add predefined tags to the secret
  },
  {
    provider: awsProvider, // Use AWS provider
  }
);

// Create a new version of the secret with the ArgoCD credentials
new aws.secretsmanager.SecretVersion(
  "argocd-secret-version",
  {
    secretId: secret.id, // Secret ID reference
    secretString: argoAdminPassword.result.apply((password) =>
      JSON.stringify({ password, username: "admin" }) // Store password and admin username
    ),
  },
  {
    provider: awsProvider, // AWS provider configuration
  }
);

/*
 * ArgoCD Installation
 * Deploy ArgoCD using a Helm chart in the EKS cluster.
 */
export const argocd = new kubernetes.helm.v3.Release(
  "argocd",
  {
    chart: "argo-cd", // ArgoCD Helm chart
    createNamespace: true, // Automatically create namespace if it doesn't exist
    name: "argocd", // Name of the Helm release
    namespace: "argocd", // Kubernetes namespace
    version: argoCdVersion, // Specify ArgoCD chart version
    repositoryOpts: {
      repo: "https://argoproj.github.io/argo-helm", // Helm chart repository URL
    },
    values: {
      environment: environment, // Add environment-specific labels
      configs: {
        params: {
          "server.insecure": true, // Enable insecure mode for ArgoCD server
        },
        repositories: {
          helm: {
            url: githubRepositoryUrl, // GitHub repository for app configurations
            name: githubRepository, // Repository name
            sshPrivateKey: repositoryDeployKey.privateKeyOpenssh, // Use the SSH private key
          },
        },
        secret: {
          argocdServerAdminPassword: argoAdminPassword.bcryptHash.apply(
            (bcryptHash) => bcryptHash // Hash the ArgoCD admin password
          ),
        },
        ingress: {
          enabled: true, // Enable ingress for ArgoCD
          annotations: {
            "kubernetes.io/ingress.class": "nginx", // Use nginx ingress class
          },
          hostname: `argocd.${dnsPublicDomain}`, // Ingress hostname
        },
      },
      metrics: {
        enabled: true,
        applicationLabels: {
          enabled: true,
        },
        serviceMonitor: {
          enabled: true,
          namespace: "monitoring",
        },
        rules: {
          enabled: true,
          namespace: "monitoring",
          spec: [
            {
              alert: "ArgoAppMissing",
              expr: "absent(argocd_app_info) == 1",
              for: "15m",
              labels: {
                severity: "critical",
              },
              annotations: {
                summary: "[Argo CD] No reported applications",
                description:
                  "Argo CD has not reported any applications data for the past 15 minutes which means that it must be down or not functioning properly. This needs to be resolved for this cloud to continue to maintain state.",
              },
            },
            {
              alert: "ArgoAppNotSynced",
              expr: 'argocd_app_info{sync_status!="Synced"} == 1',
              for: "12h",
              labels: {
                severity: "warning",
              },
              annotations: {
                summary: "[{{`{{$labels.name}}`}}] Application not synchronized",
                description:
                  "The application [{{`{{$labels.name}}`}}] has not been synchronized for over 12 hours which means that the state of this cloud has drifted away from the state inside Git.",
              },
            },
            {
              alert: "ArgocdServiceUnhealthy",
              expr: 'argocd_app_info{health_status!="Healthy"} != 0',
              for: "15m",
              labels: {
                severity: "warning",
              },
              annotations: {
                summary: "ArgoCD service unhealthy (instance {{ $labels.instance }})",
                description:
                  "Service {{ $labels.name }} run by argo is currently not healthy.\n  VALUE = {{ $value }}\n  LABELS = {{ $labels }}",
              },
            },
          ],
        },
      },
    },
  },
  {
    provider: k8sProvider, // Kubernetes provider for the EKS cluster
  }
);

// After ArgoCD is installed, set up "App of Apps" pattern for deploying multiple applications.
githubBootloaders.map((key) => {
  new kubernetes.helm.v4.Chart(
    `argocd-${key}-apps`, // Name of the chart release
    {
      chart: "argocd-apps", // Helm chart for ArgoCD applications
      namespace: "argocd", // ArgoCD namespace
      version: argoCdAppsVersion, // Chart version
      repositoryOpts: {
        repo: "https://argoproj.github.io/argo-helm", // Helm chart repository
      },
      values: {
        applications: {
          [`app-of-apps-${key}`]: {
            namespace: "argocd", // Target namespace for application
            additionalLabels: {
              environment: environment, // Add environment-specific labels
            },
            project: "default", // Default ArgoCD project
            finalizers: [
              "resources-finalizer.argocd.argoproj.io", // ArgoCD finalizer
            ],
            sources: [
              {
                repoURL: githubRepositoryUrl, // GitHub repo for application code
                path: githubBootloaderPath, // Path in the GitHub repo
                targetRevision: "HEAD", // Track the latest code on the HEAD branch
                helm: {
                  ignoreMissingValueFiles: true, // Ignore missing Helm values files
                  valueFiles: [
                    `values-${key}.yaml`, // Environment-specific values file
                    `/releases/${environment}/app-of-apps-${key}.generated.yaml`, // Environment-specific values file
                    `/releases/${environment}/app-of-apps-${key}.yaml`, // Environment-specific values file
                  ],
                },
              },
            ],
            destination: {
              server: "https://kubernetes.default.svc", // Destination Kubernetes server
              namespace: "argocd", // Target namespace in the destination cluster
            },
            syncPolicy: {
              automated: {
                prune: true, // Automatically prune unused resources
                selfHeal: true, // Enable self-healing to fix drift
              },
            },
          },
        },
      },
    },
    {
      dependsOn: [argocd], // Wait for ArgoCD to be installed
      provider: k8sProvider, // Kubernetes provider configuration
    }
  );

  uploadValueFile({
    fileName: `app-of-apps-${key}`,
    json: {
      environment: environment,
    },
  });
});
