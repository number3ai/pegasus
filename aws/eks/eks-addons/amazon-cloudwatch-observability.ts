import { environment, region } from "../variables";
import { EksAddon } from "../helpers/aws";

const valueFile = {
  fileName: "amazon-cloudwatch-observability",
  json: {
    "amazon-cloudwatch-observability": {
      clusterName: environment,
      region: region,
    },
  },
};

export const addon = new EksAddon(valueFile);
