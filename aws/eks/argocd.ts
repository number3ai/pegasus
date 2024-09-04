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

import * as aws from "@pulumi/aws";
import * as github from "@pulumi/github";
import * as kubernetes from "@pulumi/kubernetes";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";

import { awsProvider, githubProvider, k8sProvider } from "./providers";
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
} from "./variables";

const githubRepositoryUrl = `git@github.com:${githubOwner}/${githubRepository}.git`;

/* Setup GitHub Deployment Key */
// Generate an ssh key for the deploy key
const repositoryDeployKey = new tls.PrivateKey(
  `${eksClusterName}-eks-cluster-deploy-key`,
  {
    algorithm: "ED25519",
  }
);

// Add the ssh key as a deploy key
new github.RepositoryDeployKey(
  `${eksClusterName}-eks-cluster-deploy-key`,
  {
    key: repositoryDeployKey.publicKeyOpenssh,
    readOnly: true,
    repository: githubRepository,
    title: `${eksClusterName}-eks-cluster-deployment-key`,
  },
  {
    provider: githubProvider,
  }
);

// Generate a random password for ArgoCD admin user.
const argoAdminPassword = new random.RandomPassword("argocd-admin-password", {
  length: 24,
  special: false,
  lower: true,
  upper: true,
  number: true,
});

// Store the ArgoCD admin password in AWS Secrets Manager.
const secret = new aws.secretsmanager.Secret(
  "argocd-secret",
  {
    name: `${eksClusterName}/argocd/credentials`,
    description: "ArgoCD admin credentials",
    recoveryWindowInDays: 0, // Force deletion without recovery
    tags: tags,
  },
  {
    provider: awsProvider,
  }
);

new aws.secretsmanager.SecretVersion(
  "argocd-secret-version",
  {
    secretId: secret.id,
    secretString: argoAdminPassword.result.apply((password) =>
      JSON.stringify({ password, username: "admin" })
    ),
  },
  {
    provider: awsProvider,
  }
);

// Create a namespace for ArgoCD
const argocdNamespace = new kubernetes.core.v1.Namespace(
  "argocd", 
  {
    metadata: {
        name: "argocd",
        annotations: {
            "argocd.io/tolerations": JSON.stringify([
                {
                    key: "node.cilium.io/agent-not-ready",
                    operator: "Exists",
                    effect: "NoExecute",
                },
            ]),
        },
    },
  }, 
  {
    provider: k8sProvider,
  }
);

/* ArgoCD Setup */
// ArgoCD Installation
export const argocd = new kubernetes.helm.v3.Release(
  "argocd",
  {
    chart: "argo-cd",
    createNamespace: true,
    name: "argocd",
    namespace: "argocd",
    version: argoCdVersion,
    repositoryOpts: {
      repo: "https://argoproj.github.io/argo-helm",
    },
    values: {
      configs: {
        params: {
          "server.insecure": true,
        },
        repositories: {
          helm: {
            url: githubRepositoryUrl,
            name: githubRepository,
            sshPrivateKey: repositoryDeployKey.privateKeyOpenssh,
          },
        },
        secret: {
          argocdServerAdminPassword: argoAdminPassword.bcryptHash.apply(
            (bcryptHash) => bcryptHash
          ),
        },
        ingress: {
          enabled: true,
          annotations: {
            ["kubernetes.io/ingress.class"]: "nginx",
          },
          hostname: `argocd.${dnsPublicDomain}`,
        },
      },
    },
  },
  {
    dependsOn: [argocdNamespace],
    provider: k8sProvider,
  }
);

argocd.resourceNames.apply(() => {
  githubBootloaders.map(
    (key) =>
      new kubernetes.helm.v4.Chart(
        `argocd-${key}-apps`,
        {
          chart: "argocd-apps",
          namespace: "argocd",
          version: argoCdAppsVersion,
          repositoryOpts: {
            repo: "https://argoproj.github.io/argo-helm",
          },
          values: {
            applications: {
              [`app-of-apps-${key}`]: {
                namespace: "argocd",
                additionalLabels: {
                  environment: environment,
                },
                project: "default",
                sources: [
                  {
                    repoURL: githubRepositoryUrl,
                    path: `${githubBootloaderPath}`,
                    targetRevision: "HEAD",
                    helm: {
                      ignoreMissingValueFiles: true,
                      valueFiles: [
                        "values.yaml",
                        `values-${environment}.yaml`,
                        `values-${key}.yaml`,
                        `values-${key}-${environment}.yaml`,
                      ],
                    },
                  },
                ],
                destination: {
                  server: "https://kubernetes.default.svc",
                  namespace: "argocd",
                },
                syncPolicy: {
                  automated: {
                    prune: true,
                    selfHeal: true,
                  },
                },
              },
            },
          },
        },
        {
          provider: k8sProvider,
        }
      )
  );
});
