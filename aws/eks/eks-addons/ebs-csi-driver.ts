
import { createIRSARole, EksAddon } from "../helpers/aws"; // Import the createIRSARole function

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

export const addon = role.arn.apply(arn => {
  const valueFile = {
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

  return new EksAddon(valueFile, role);
});
