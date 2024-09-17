import { environment, region } from "../variables";
import { uploadValueFile } from "../helpers/git";

uploadValueFile({
  fileName: "amazon-cloudwatch-observability",
  json: {
    "amazon-cloudwatch-observability": {
      clusterName: environment,
      region: region,
    },
  },
});
