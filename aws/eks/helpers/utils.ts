import * as yaml from "js-yaml";
import * as pulumi from "@pulumi/pulumi";

import { Buffer } from "buffer";

// Function to convert JSON to YAML and then encode to base64
export function jsonToYaml(jsonObject: object): string {
  return Buffer.from(yaml.dump(jsonObject)).toString("ascii");
}
