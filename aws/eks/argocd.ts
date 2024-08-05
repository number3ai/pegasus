import * as aws from "@pulumi/aws";
import * as github from "@pulumi/github";
import * as kubernetes from "@pulumi/kubernetes";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";

import { awsProvider, githubProvider, kubeProvider } from "./providers";
import { argoCdAppsVersion, argoCdVersion } from "./variables";
import { eksClusterName, environment, tags } from "./variables";
import { githubOwner, githubBootloaderPath, githubBootloaders, githubRepository} from "./variables";

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

/* ArgoCD Setup */
// ArgoCD Installation
export const argocd = kubeProvider.apply((provider) => {
  const argocd = new kubernetes.helm.v3.Release(
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
        },
      },
    },
    {
      provider: provider,
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
            provider: provider,
          }
        )
    );
  });
  
  return argocd;
});
