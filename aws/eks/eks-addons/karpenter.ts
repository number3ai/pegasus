import { accountId, environment, region } from "../variables";
import { createIRSARole } from "../helpers/aws";
import { uploadValueFile } from "../helpers/git";

export const role = createIRSARole(
  "karpenter",
  "kube-system",
  [],
  [
    {
      actions: [
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeImages",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceTypeOfferings",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplates",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSpotPriceHistory",
        "ec2:DescribeSubnets",
        "ec2:TerminateInstances",
        "eks:DescribeCluster",
        "iam:AddRoleToInstanceProfile",
        "iam:CreateInstanceProfile",
        "iam:DeleteInstanceProfile",
        "iam:GetInstanceProfile",
        "iam:PassRole",
        "iam:RemoveRoleFromInstanceProfile",
        "iam:TagInstanceProfile",
        "pricing:GetProducts",
        "ssm:GetParameter",
      ],
      resources: ["*"],
    },
    {
      actions: [
        "ec2:CreateFleet",
        "ec2:CreateLaunchTemplate",
        "ec2:CreateTags",
        "ec2:DeleteLaunchTemplate",
        "ec2:RunInstances",
      ],
      resources: [
        `arn:aws:ec2:${region}:${accountId}:*`,
        `arn:aws:ec2:${region}::image/*`,
      ],
    },
  ]
);

role.arn.apply(arn => {
  uploadValueFile({
    fileName: "karpenter",
    json: {
      karpenter: {
        settings: {
          clusterName: environment,
        },
        serviceAccount: {
          name: "karpenter-sa",
          annotations: {
            "eks.amazonaws.com/role-arn": arn,
          },
        },
        defaultProvisioner: {
          requirements: [
            {
              key: "node.kubernetes.io/instance-type",
              operator: "In",
              values: ["t3.medium", "t3.large"],
            },
          ],
        },
      },
    },
  });
});
