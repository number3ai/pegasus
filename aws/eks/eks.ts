import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

import * as iam from "./eks-iam";

import { desiredSize, eksClusterName, eksNodeRootVolumeSize, eksVersion } from "./variables";
import { eksVPCCIDRBlock, instanceType, minSize, maxSize, tags } from "./variables";

// Create a VPC for our cluster.
export const eksVpc = new awsx.ec2.Vpc(`${eksClusterName}-vpc`,
  {
    assignGeneratedIpv6CidrBlock: false,
    cidrBlock: eksVPCCIDRBlock,
    enableDnsSupport: true,
    enableNetworkAddressUsageMetrics: true,
    subnetStrategy: "Auto",
    subnetSpecs: [
      { type: awsx.ec2.SubnetType.Public },
      { type: awsx.ec2.SubnetType.Private },
    ],
    tags: tags,
  }
);

// Create an instance role for the EKS cluster.
export const instanceRoles = iam.createRoles(`${eksClusterName}-instance-role`, 3);

// Debug: Print the VPC configuration
eksVpc.vpcId.apply(() => {
  console.log("----------[ VPC Configuration ]---------------");
  console.log("[+] VPC ID: ", eksVpc.vpcId);
  console.log("[+] Public Subnet IDs: ")
  eksVpc.publicSubnetIds.apply(subnetIds => {
    subnetIds.forEach((subnet, index) => {
      console.log(`\t[*] Using Public Subnet ${index}: ${subnet}`);
    });
  });
  console.log("[+] Private Subnet IDs: ")
  eksVpc.privateSubnetIds.apply(subnetIds => {  
    subnetIds.forEach((subnet, index) => {
      console.log(`\t[*] Using Private Subnet ${index}: ${subnet}`);
    }); 
  });
  console.log();
});


// Create an EKS cluster without node group configuration. We will add this later.
export const cluster = new eks.Cluster(`${eksClusterName}-cluster`,
  {
    createOidcProvider: true,
    deployDashboard: false,
    enabledClusterLogTypes: [
      "api",
      "audit",
      "authenticator",
      "controllerManager",
      "scheduler",
    ],
    endpointPublicAccess: true,
    instanceRoles: instanceRoles,
    name: eksClusterName,
    nodeAssociatePublicIpAddress: false,
    nodeRootVolumeEncrypted: true,
    nodeRootVolumeSize: eksNodeRootVolumeSize,
    privateSubnetIds: eksVpc.privateSubnetIds,
    publicSubnetIds: eksVpc.publicSubnetIds,
    skipDefaultNodeGroup: true,
    storageClasses: {
      gp2: {
        allowVolumeExpansion: true,
        default: true,
        encrypted: true,
        reclaimPolicy: "Delete",
        type: "gp2",
        volumeBindingMode: "Immediate",
      },
    },
    tags: tags,
    version: eksVersion,
    vpcId: eksVpc.vpcId,
  }
);

// Create an EKS managed node group.
eks.createManagedNodeGroup(`${eksClusterName}-node-group`,
  {
    cluster: cluster,
    enableIMDSv2: true,
    diskSize: eksNodeRootVolumeSize,
    instanceTypes: [instanceType],
    labels: { 
      ondemand: "true", 
    },
    nodeGroupName: `${eksClusterName}-nodegroup`,
    nodeRoleArn: cluster.instanceRoles[0].arn,
    scalingConfig: {
      desiredSize: desiredSize,
      maxSize: maxSize,
      minSize: minSize,
    },
    tags: tags,
  },
);

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Debug: Print the EKS cluster configuration
cluster.core.cluster.name.apply(eksClusterName => {
  console.log("----------[ EKS Cluster Configuration ]---------------");
  console.log(`\t[+] Using Cluster Name: ${eksClusterName}`);
  console.log(`\t[+] Using EKS Version: ${eksVersion}\n`);

  console.log("----------[ EKS Node Group Configuration ]---------------");
  console.log("\t[+] Node Group Name: ", `${eksClusterName}-nodegroup`);
  console.log(`\t[+] Using Instance Type: ${instanceType}`);
  console.log(`\t[+] Using Root Volume Size: ${eksNodeRootVolumeSize}`);
  console.log("\t[+] Scaling Configuration");
  console.log(`\t\t[*] Using Desired Size: ${desiredSize}`);
  console.log(`\t\t[*] Using Min Size: ${minSize}`);
  console.log(`\t\t[*] Using Max Size: ${maxSize}\n`);
});
