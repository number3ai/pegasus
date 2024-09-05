/**
 * This Pulumi code is used to automate the setup and configuration of an AWS EKS cluster 
 * integrated with GitHub and ArgoCD, focusing on deploying Kubernetes applications. 
 * 
 * Breakdown:
 * 
 * 1. GitHub Deployment Key Setup:
 *    - Generates an ED25519 SSH private key using the `tls` package.
 *    - Registers this SSH key as a "deploy key" in a specified GitHub repository, allowing 
 *      the EKS cluster to securely pull code from the repository.
 * 
 * 2. ArgoCD Admin Password:
 *    - Creates a random 24-character password for the ArgoCD admin user using `RandomPassword`.
 *    - Stores the ArgoCD admin credentials (username and password) in AWS Secrets Manager 
 *      using the `aws.secretsmanager.Secret` resource to ensure sensitive credentials are 
 *      stored securely.
 * 
 * 3. ArgoCD Installation via Helm:
 *    - Uses the `kubernetes.helm.v3.Release` resource to install ArgoCD on the Kubernetes cluster.
 *    - Configures ArgoCD to allow insecure connections (via the `server.insecure` setting) and 
 *      sets up GitHub repository access using the generated SSH key.
 *    - Adds the ArgoCD admin password to the ArgoCD server configuration.
 *    - Configures an Nginx-based ingress for ArgoCD, accessible via a public DNS domain 
 *      (`argocd.{dnsPublicDomain}`).
 * 
 * 4. ArgoCD Application Management:
 *    - Once ArgoCD is installed, the script sets up "App of Apps" patterns using the 
 *      `kubernetes.helm.v4.Chart` resource.
 *    - Each ArgoCD app pulls its configuration from a specific path in the GitHub repository and 
 *      deploys to the Kubernetes cluster. The configuration includes Helm chart values files, 
 *      specific to the environment and application.
 *    - Sync policies for these applications are automated, with pruning and self-healing enabled, 
 *      allowing ArgoCD to automatically reconcile and heal any configuration drift.
 * 
 * Summary:
 * This code automates the deployment of ArgoCD into an AWS EKS cluster, integrates it with 
 * a GitHub repository using SSH deploy keys, secures credentials in AWS Secrets Manager, 
 * and sets up automated Kubernetes app deployment with ArgoCD using a Helm-based "App of Apps" approach.
 */

import * as aws from "@pulumi/aws"; // Import AWS-related resources from Pulumi
import * as github from "@pulumi/github"; // Import GitHub-related resources from Pulumi
import * as kubernetes from "@pulumi/kubernetes"; // Import Kubernetes-related resources from Pulumi
import * as random from "@pulumi/random"; // Import random generation utilities from Pulumi
import * as tls from "@pulumi/tls"; // Import TLS-related resources from Pulumi

import { awsProvider, githubProvider, k8sProvider } from "./providers"; // Import provider configurations
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
} from "./variables"; // Import necessary variables

// Construct GitHub repository URL
const githubRepositoryUrl = `git@github.com:${githubOwner}/${githubRepository}.git`;

/* 
 * GitHub Deployment Key Setup
 * Generate an ED25519 SSH private key for authenticating the EKS cluster with the GitHub repository.
 */
const repositoryDeployKey = new tls.PrivateKey(
  `${eksClusterName}-eks-cluster-deploy-key`,
  {
    algorithm: "ED25519", // Algorithm for SSH key generation
  }
);

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
            ["kubernetes.io/ingress.class"]: "nginx", // Use nginx ingress class
          },
          hostname: `argocd.${dnsPublicDomain}`, // Ingress hostname
        },
      },
    },
  },
  {
    provider: k8sProvider, // Kubernetes provider for the EKS cluster
  }
);

// After ArgoCD is installed, set up "App of Apps" pattern for deploying multiple applications.
argocd.resourceNames.apply(() => {
  githubBootloaders.map(
    (key) =>
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
                sources: [
                  {
                    repoURL: githubRepositoryUrl, // GitHub repo for application code
                    path: `${githubBootloaderPath}`, // Path in the GitHub repo
                    targetRevision: "HEAD", // Track the latest code on the HEAD branch
                    helm: {
                      ignoreMissingValueFiles: true, // Ignore missing Helm values files
                      valueFiles: [
                        "values.yaml", // Base values file
                        `values-${environment}.yaml`, // Environment-specific values file
                        `values-${key}.yaml`, // Key-specific values file
                        `values-${key}-${environment}.yaml`, // Combined environment and key values
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
          provider: k8sProvider, // Kubernetes provider configuration
        }
      )
  );
});
