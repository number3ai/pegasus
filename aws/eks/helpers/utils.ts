import * as yaml from "js-yaml";
import * as pulumi from "@pulumi/pulumi";

import { Buffer } from "buffer";

// Function to convert JSON to YAML and then encode to base64
export function jsonToYaml(jsonObject: object): string {
  pulumi.log.info("---------------------STARTING Converting JSON to YAML");
  pulumi.log.info(JSON.stringify(jsonObject));
  pulumi.log.info("---------------------Converting JSON to YAML");
  pulumi.log.info(yaml.dump(jsonObject));
  pulumi.log.info("---------------------FULL Converting JSON to YAML");
  pulumi.log.info(Buffer.from(yaml.dump(jsonObject)).toString("ascii"));
  pulumi.log.info("---------------------DONE Converting JSON to YAML");
  return Buffer.from(yaml.dump(jsonObject)).toString("ascii");
}
