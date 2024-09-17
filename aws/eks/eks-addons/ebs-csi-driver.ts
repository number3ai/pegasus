
import { createIRSARole } from "../helpers/aws"; // Import the createIRSARole function

export const role = createIRSARole(
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

export const valueFile = role.arn.apply(arn => {
  return {
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
  };
});
