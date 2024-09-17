
import { createIRSARole } from "../helpers/aws"; // Import the createIRSARole function
import { processGitPrFiles } from "../helpers/git"; // Import the createGitPR function

export const awsEbsCsiDriverIrsaRole = createIRSARole(
  "aws-ebs-csi-driver",
  "kube-system",
  ["arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"],
  [
    {
      actions: [
        "kms:Decrypt",
        "kms:GenerateDataKeyWithoutPlaintext",
        "kms:CreateGrant",
      ],
      resources: ["*"],
    },
  ]
);

awsEbsCsiDriverIrsaRole.arn.apply(arn => {
  processGitPrFiles([
    {
      fileName: "aws-ebs-csi-driver",
      json: {
        "aws-ebs-csi-driver": {
          controller: {
            serviceAccount: {
              annotations: {
                "eks.amazonaws.com/role-arn": arn,
              },
            },
          },
        },
      },
    }
  ]);
});
