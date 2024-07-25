import { eksClusterName, region } from "./variables";

// Output the AWS EKS update-kubeconfig command
console.log("Run the following command to update your kubeconfig:");
console.log(`\taws eks update-kubeconfig --region ${region} --name ${eksClusterName} --alias ${eksClusterName}`);
