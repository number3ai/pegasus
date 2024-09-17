
import { createIRSARole } from "../helpers/aws"; // Import the createIRSARole function
import { uploadValueFile } from "../helpers/git";

createIRSARole(
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
).arn.apply(arn => {
  uploadValueFile({
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
  });
});
