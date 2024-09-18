import { accountId, region } from "../variables";
import { createIRSARole } from "../helpers/aws";
import { uploadValueFile } from "../helpers/git";

createIRSARole(
  "external-secrets",
  "external-secrets",
  [],
  [
    {
      actions: [
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:*`],
    },
  ]
).apply(arn => {
  uploadValueFile({
    fileName: "external-secrets",
    json: {
      "external-secrets": {
        serviceAccount: {
          annotations: {
            "eks.amazonaws.com/role-arn": arn,
          },
        },
      },
    },
  });
});
