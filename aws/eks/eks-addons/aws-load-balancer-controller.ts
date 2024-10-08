import { eksVpc } from "../eks";
import { environment, region } from "../variables";
import { createIRSARole } from "../helpers/aws";
import { uploadValueFile } from "../helpers/git";

createIRSARole(
  "aws-load-balancer-controller",
  "kube-system",
  [],
  [
    {
      actions: [
        "acm:DescribeCertificate",
        "acm:ListCertificates",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:DescribeInstances",
        "elasticloadbalancing:CreateLoadBalancer",
        "elasticloadbalancing:ModifyLoadBalancerAttributes",
        "elasticloadbalancing:SetWebAcl",
        "iam:ListServerCertificates",
        "shield:DescribeProtection",
        "wafv2:AssociateWebACL",
        "elasticloadbalancing:DescribeTargetGroups",
      ],
      resources: ["*"],
    },
    {
      actions: ["ec2:CreateTags", "ec2:DeleteTags"],
      resources: ["arn:aws:ec2:*:*:security-group/*"],
    },
    {
      actions: [
        "elasticloadbalancing:RegisterTargets",
        "elasticloadbalancing:DeregisterTargets",
      ],
      resources: ["arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"],
    },
  ]
).apply(arn => {
  eksVpc.vpcId.apply(vpcId => {
    uploadValueFile({
      fileName: "aws-load-balancer-controller",
      json: {
        "aws-load-balancer-controller": {
          clusterName: environment,
          region: region,
          serviceAccount: {
            annotations: {
              "eks.amazonaws.com/role-arn": arn,
            },
          },
          vpcId: vpcId,
        },
      },
    });
  });
});
