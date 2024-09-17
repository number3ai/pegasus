import { environment, region } from "../variables";
import { processGitPrFiles } from "../helpers/git";

processGitPrFiles([
  {
    fileName: "amazon-cloudwatch-observability",
    json: {
      "amazon-cloudwatch-observability": {
        clusterName: environment,
        region: region,
      },
    },
  },
]);
