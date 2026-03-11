/**
 * Kubernetes Provider Configuration
 * Centralized Kubernetes provider setup for the Pegasus EKS infrastructure
 */

import * as kubernetes from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { eksClusterName } from "../config/variables";

/**
 * Kubernetes Provider Configuration
 * Configures the Kubernetes provider using the EKS cluster's kubeconfig
 * This provider is used for deploying resources to the EKS cluster
 */
export function createKubernetesProvider(cluster: any): kubernetes.Provider {
  return new kubernetes.Provider("k8s", {
    kubeconfig: cluster.kubeconfig.apply(JSON.stringify),
  }, {
    dependsOn: cluster,
  });
}

/**
 * Get Kubernetes provider with default configuration
 * This function should be called after the EKS cluster is created
 */
export function getKubernetesProvider(): kubernetes.Provider {
  // This will be set after the cluster is created
  return new kubernetes.Provider("k8s-default", {});
}

/**
 * Validate Kubernetes provider configuration
 * Ensures the provider can connect to the cluster
 */
export async function validateKubernetesProvider(provider: kubernetes.Provider): Promise<void> {
  try {
    const nodes = new kubernetes.core.v1.NodeList("validation-nodes", {}, { provider });
    await nodes.metadata;
    
    console.log("✅ Kubernetes provider configured successfully");
  } catch (error) {
    throw new Error(`❌ Kubernetes provider validation failed: ${error}`);
  }
}

/**
 * Create a Kubernetes namespace with proper labels and annotations
 * @param name - Namespace name
 * @param labels - Optional labels
 * @param annotations - Optional annotations
 */
export function createNamespace(
  name: string,
  labels: Record<string, string> = {},
  annotations: Record<string, string> = {}
): kubernetes.core.v1.Namespace {
  return new kubernetes.core.v1.Namespace(
    `namespace-${name}`,
    {
      metadata: {
        name,
        labels: {
          "app.kubernetes.io/name": name,
          "app.kubernetes.io/part-of": "pegasus",
          ...labels,
        },
        annotations: {
          "pulumi.com/skipAwait": "true",
          ...annotations,
        },
      },
    }
  );
} 