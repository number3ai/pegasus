/**
 * YAML Utilities
 * Helper functions for YAML operations in the Pegasus EKS infrastructure
 */

import * as yaml from "js-yaml";
import { Buffer } from "buffer";

/**
 * Convert JSON object to YAML string
 * @param jsonObject - The JSON object to convert
 * @returns YAML string representation
 */
export function jsonToYaml(jsonObject: object): string {
  try {
    return Buffer.from(yaml.dump(jsonObject)).toString("ascii");
  } catch (error) {
    throw new Error(`Failed to convert JSON to YAML: ${error}`);
  }
}

/**
 * Convert YAML string to JSON object
 * @param yamlString - The YAML string to convert
 * @returns JSON object representation
 */
export function yamlToJson(yamlString: string): object {
  try {
    return yaml.load(yamlString) as object;
  } catch (error) {
    throw new Error(`Failed to convert YAML to JSON: ${error}`);
  }
}

/**
 * Validate YAML syntax
 * @param yamlString - The YAML string to validate
 * @returns True if valid, throws error if invalid
 */
export function validateYaml(yamlString: string): boolean {
  try {
    yaml.load(yamlString);
    return true;
  } catch (error) {
    throw new Error(`Invalid YAML syntax: ${error}`);
  }
}

/**
 * Merge multiple YAML objects
 * @param objects - Array of objects to merge
 * @returns Merged object
 */
export function mergeYamlObjects(...objects: object[]): object {
  return objects.reduce((merged, current) => {
    return { ...merged, ...current };
  }, {});
}

/**
 * Create a Kubernetes resource YAML
 * @param apiVersion - Kubernetes API version
 * @param kind - Resource kind
 * @param metadata - Resource metadata
 * @param spec - Resource specification
 * @returns YAML string
 */
export function createK8sResourceYaml(
  apiVersion: string,
  kind: string,
  metadata: object,
  spec?: object
): string {
  const resource = {
    apiVersion,
    kind,
    metadata,
    ...(spec && { spec }),
  };
  
  return jsonToYaml(resource);
} 