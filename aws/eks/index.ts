/**
 * Summary:
 * This code organizes and executes key infrastructure modules, including cloud provider setup, DNS management, EKS configuration,
 * EKS addons, and ArgoCD for GitOps. Each module contributes to building a comprehensive cloud-native infrastructure.
 * 
 * This is the main entry point for the Pulumi program.
 */

import "./providers"; // Import and execute the providers configuration
import "./dns"; // Import and execute the DNS configuration
import "./eks"; // Import and execute the EKS setup
import "./eks-addons"; // Import and execute the EKS addons configuration
import "./argocd"; // Import and execute the ArgoCD setup
