import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as kubernetes from "@pulumi/kubernetes";

import { awsProvider } from "./providers";
import { awsProfile, desiredSize, eksClusterName, eksVersion, instanceType, minSize, maxSize, tags } from "./variables";

// Create a VPC for our cluster.
export const vpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`,
  {
    assignGeneratedIpv6CidrBlock: false,
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableNetworkAddressUsageMetrics: true,
    tags: tags,
  },
  {
    provider: awsProvider,
  },
);

// Create an EKS cluster without node group configuration.
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`,
  {
    enabledClusterLogTypes: [
      "api",
      "audit",
      "authenticator",
      "controllerManager",
      "scheduler",
    ],
    endpointPrivateAccess: true,
    endpointPublicAccess: true,
    name: eksClusterName,
    nodeRootVolumeEncrypted: true,
    nodeRootVolumeSize: 200,
    providerCredentialOpts: { profileName: awsProfile },
    subnetIds: vpc.publicSubnetIds,
    tags: tags,
    version: eksVersion,
    vpcId: vpc.vpcId,
  },
  {
    dependsOn: [vpc],
    provider: awsProvider,
  },
);

// Create an EKS managed node group.
new eks.ManagedNodeGroup(`${eksClusterName}-node-group`,
  {
    cluster: cluster,
    instanceTypes: [instanceType],
    nodeGroupName: `${eksClusterName}-nodegroup`,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    diskSize: 200,
    tags: tags,

    scalingConfig: {
      desiredSize: desiredSize,
      maxSize: maxSize,
      minSize: minSize,
    },
  },
  {
    dependsOn: [cluster],
    provider: awsProvider,
  },
);

// Create a default EBS storage class for the EKS cluster.

// Create a default EBS storage class for the EKS cluster using gp2 EBS volume
const gp2StorageClass = new kubernetes.storage.v1.StorageClass("storage-gp2", {
  metadata: {
      name: "gp2-default",
      annotations: {
          "storageclass.kubernetes.io/is-default-class": "true",
      },
  },
  provisioner: "kubernetes.io/aws-ebs",
  parameters: {
      type: "gp2",
  },
  reclaimPolicy: "Delete",
  volumeBindingMode: "Immediate",
}, {
  provider: cluster.provider,
});
