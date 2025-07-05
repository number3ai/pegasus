/**
 * ArgoCD Add-on
 * GitOps workflow configuration for the Pegasus EKS infrastructure
 */

import * as aws from "@pulumi/aws";
import * as github from "@pulumi/github";
import * as kubernetes from "@pulumi/kubernetes";
import * as random from "@pulumi/random";
import * as tls from "@pulumi/tls";

import { cluster } from "../core/cluster";
import { wildcardCertificate } from "../core/dns";
import { awsProvider, githubProvider } from "../providers/aws";
import { createKubernetesProvider } from "../providers/kubernetes";
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
  githubRepositoryUrl,
  tags,
} from "../config/variables";
import { DEFAULTS, GIT, K8S_NAMESPACES } from "../config/constants";
import { uploadValueFile } from "../utils/git";

/**
 * ArgoCD Configuration Interface
 */
interface ArgoCDConfig {
  version: string;
  appsVersion: string;
  adminPassword: string;
  domain: string;
  repositoryUrl: string;
  repositoryName: string;
  bootloaderPath: string;
  bootloaders: string[];
}

/**
 * Create ArgoCD deployment key for Git repository access
 * @param clusterName - EKS cluster name
 * @returns SSH key pair for repository access
 */
function createDeployKey(clusterName: string): tls.PrivateKey {
  const deployKey = new tls.PrivateKey(`${clusterName}-deploy-key`, {
    algorithm: "ED25519",
  });

  // Register the SSH key as a GitHub deploy key
  new github.RepositoryDeployKey(
    `${clusterName}-deploy-key`,
    {
      key: deployKey.publicKeyOpenssh,
      readOnly: true,
      repository: githubRepository,
      title: `${clusterName}-deployment-key`,
    },
    {
      provider: githubProvider,
    }
  );

  return deployKey;
}

/**
 * Create ArgoCD admin password and store in AWS Secrets Manager
 * @param clusterName - EKS cluster name
 * @returns Random password for ArgoCD admin
 */
function createAdminPassword(clusterName: string): random.RandomPassword {
  const adminPassword = new random.RandomPassword(`${clusterName}-argocd-admin-password`, {
    length: DEFAULTS.PASSWORD_LENGTH,
    special: false,
    lower: true,
    upper: true,
    number: true,
  });

  // Store password in AWS Secrets Manager
  const secret = new aws.secretsmanager.Secret(
    `${clusterName}-argocd-secret`,
    {
      name: `${clusterName}/argocd/credentials`,
      description: "ArgoCD admin credentials",
      recoveryWindowInDays: 0,
      tags: {
        ...tags,
        service: "argocd",
        cluster: clusterName,
      },
    },
    {
      provider: awsProvider,
    }
  );

  // Create secret version with credentials
  new aws.secretsmanager.SecretVersion(
    `${clusterName}-argocd-secret-version`,
    {
      secretId: secret.id,
      secretString: adminPassword.result.apply((password) =>
        JSON.stringify({ password, username: "admin" })
      ),
    },
    {
      provider: awsProvider,
    }
  );

  return adminPassword;
}

/**
 * Create ArgoCD Helm release
 * @param config - ArgoCD configuration
 * @param deployKey - SSH deploy key
 * @param adminPassword - Admin password
 * @param k8sProvider - Kubernetes provider
 * @returns ArgoCD Helm release
 */
function createArgoCDRelease(
  config: ArgoCDConfig,
  deployKey: tls.PrivateKey,
  adminPassword: random.RandomPassword,
  k8sProvider: kubernetes.Provider
): kubernetes.helm.v3.Release {
  return new kubernetes.helm.v3.Release(
    "argocd",
    {
      chart: "argo-cd",
      createNamespace: true,
      name: "argocd",
      namespace: K8S_NAMESPACES.ARGOCD,
      version: config.version,
      repositoryOpts: {
        repo: "https://argoproj.github.io/argo-helm",
      },
      values: {
        environment: environment,
        configs: {
          params: {
            "server.insecure": true,
          },
          repositories: {
            helm: {
              url: config.repositoryUrl,
              name: config.repositoryName,
              sshPrivateKey: deployKey.privateKeyOpenssh,
            },
          },
          secret: {
            argocdServerAdminPassword: adminPassword.bcryptHash,
          },
          ingress: {
            enabled: true,
            annotations: {
              "kubernetes.io/ingress.class": "nginx",
            },
            hostname: `argocd.${config.domain}`,
          },
        },
        metrics: {
          enabled: true,
          applicationLabels: {
            enabled: true,
          },
          serviceMonitor: {
            enabled: true,
            namespace: K8S_NAMESPACES.MONITORING,
          },
          rules: {
            enabled: true,
            namespace: K8S_NAMESPACES.MONITORING,
            spec: createArgoCDAlertRules(),
          },
        },
      },
    },
    {
      provider: k8sProvider,
    }
  );
}

/**
 * Create ArgoCD alert rules for monitoring
 * @returns Array of alert rule configurations
 */
function createArgoCDAlertRules(): any[] {
  return [
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
          "Argo CD has not reported any applications data for the past 15 minutes which means that it must be down or not functioning properly.",
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
          "The application [{{`{{$labels.name}}`}}] has not been synchronized for over 12 hours.",
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
        description: "Service {{ $labels.name }} run by argo is currently not healthy.",
      },
    },
  ];
}

/**
 * Create ArgoCD "App of Apps" pattern
 * @param config - ArgoCD configuration
 * @param k8sProvider - Kubernetes provider
 * @param argocdRelease - ArgoCD release
 */
function createAppOfApps(
  config: ArgoCDConfig,
  k8sProvider: kubernetes.Provider,
  argocdRelease: kubernetes.helm.v3.Release
): void {
  config.bootloaders.forEach((bootloader) => {
    // Create Helm chart for app-of-apps
    new kubernetes.helm.v4.Chart(
      `argocd-${bootloader}-apps`,
      {
        chart: "argocd-apps",
        namespace: K8S_NAMESPACES.ARGOCD,
        version: config.appsVersion,
        repositoryOpts: {
          repo: "https://argoproj.github.io/argo-helm",
        },
        values: {
          applications: {
            [`app-of-apps-${bootloader}`]: {
              namespace: K8S_NAMESPACES.ARGOCD,
              additionalLabels: {
                environment: environment,
              },
              project: "default",
              finalizers: ["resources-finalizer.argocd.argoproj.io"],
              sources: [
                {
                  repoURL: config.repositoryUrl,
                  path: config.bootloaderPath,
                  targetRevision: "HEAD",
                  helm: {
                    ignoreMissingValueFiles: true,
                    valueFiles: [
                      `values-${bootloader}.yaml`,
                      `/releases/${environment}/app-of-apps-${bootloader}.generated.yaml`,
                      `/releases/${environment}/app-of-apps-${bootloader}.yaml`,
                    ],
                  },
                },
              ],
              destination: {
                server: "https://kubernetes.default.svc",
                namespace: K8S_NAMESPACES.ARGOCD,
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
        dependsOn: [argocdRelease],
        provider: k8sProvider,
      }
    );

    // Upload values file for the bootloader
    uploadValueFile({
      fileName: `app-of-apps-${bootloader}`,
      json: {
        environment: environment,
      },
    });
  });
}

/**
 * Main ArgoCD deployment function
 * @param k8sProvider - Kubernetes provider
 * @returns ArgoCD deployment resources
 */
export function deployArgoCD(k8sProvider: kubernetes.Provider) {
  const config: ArgoCDConfig = {
    version: argoCdVersion,
    appsVersion: argoCdAppsVersion,
    adminPassword: "", // Will be generated
    domain: dnsPublicDomain,
    repositoryUrl: githubRepositoryUrl,
    repositoryName: githubRepository,
    bootloaderPath: githubBootloaderPath,
    bootloaders: githubBootloaders,
  };

  // Create deployment key and admin password
  const deployKey = createDeployKey(eksClusterName);
  const adminPassword = createAdminPassword(eksClusterName);

  // Create ArgoCD release
  const argocdRelease = createArgoCDRelease(config, deployKey, adminPassword, k8sProvider);

  // Create app-of-apps pattern
  createAppOfApps(config, k8sProvider, argocdRelease);

  return {
    argocdRelease,
    deployKey,
    adminPassword,
  };
} 