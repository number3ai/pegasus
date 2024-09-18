import * as yaml from "js-yaml";
import { Buffer } from "buffer";

// Function to convert JSON to YAML and then encode to ASCII
export function jsonToYaml(jsonObject: object): string {
  return Buffer.from(yaml.dump(jsonObject)).toString("ascii");
}
