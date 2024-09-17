import { environment, region } from "../variables";

export const valueFiles = {
  fileName: "amazon-cloudwatch-observability",
  json: {
    "amazon-cloudwatch-observability": {
      clusterName: environment,
      region: region,
    },
  },
};
