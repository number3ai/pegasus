/**
 * This Pulumi code sets up private and public DNS zones using AWS Route 53 and provisions 
 * a wildcard SSL/TLS certificate for the internal domain.
 * 
 * Breakdown:
 * 
 * 1. Private DNS Zone Setup:
 *    - Creates a private Route 53 DNS zone for the internal domain (`int.brandon.com`) using the 
 *      `aws.route53.Zone` resource.
 *    - The private zone is associated with the VPC (`eksVpc.vpcId`) where the EKS cluster resides.
 * 
 * 2. Public DNS Zone Setup:
 *    - Creates a public Route 53 DNS zone for the external domain (`brandon.com`) using the 
 *      `aws.route53.Zone` resource.
 *    - The public zone is also associated with the same VPC for consistent DNS management.
 * 
 * 3. Wildcard SSL/TLS Certificate:
 *    - Provisions a wildcard SSL/TLS certificate for the internal domain (`*.int.brandon.com`) using 
 *      AWS ACM (`aws.acm.Certificate`).
 *    - The certificate is validated using DNS validation, with the option to include additional 
 *      Subject Alternative Names (SANs) if needed.
 *    - Tags are applied to the certificate for better organization and management in AWS.
 * 
 * 4. Exports:
 *    - Exports the `zoneId` for both the private and public DNS zones for use in other components 
 *      or resources.
 *    - Exports the `arn` (Amazon Resource Name) of the wildcard certificate for reference and 
 *      to be used in other configurations that require SSL/TLS encryption.
 * 
 * Summary:
 * This code automates the creation of both private and public Route 53 DNS zones in AWS, and 
 * provisions a wildcard SSL/TLS certificate for secure internal communications using DNS validation.
 */

import * as aws from "@pulumi/aws"; // Import AWS-related resources from Pulumi

import { eksVpc } from "./eks"; // Import VPC details from the EKS module
import { awsProvider } from "./providers"; // Import the AWS provider configuration

import { dnsPrivateDomain, dnsPublicDomain, region, tags } from "./variables"; // Import necessary variables

/* 
 * Create a private Route 53 DNS zone for internal domain resolution (e.g., 'int.brandon.com')
 * This zone is associated with the VPC used by the EKS cluster.
 */
const privateZone = new aws.route53.Zone(
  "dns-int-hosted-zone", // Name for the private DNS zone
  {
    name: dnsPrivateDomain, // The domain name for the private zone
    vpcs: [
      {
        vpcId: eksVpc.vpcId, // The VPC ID to associate with the private DNS zone
        vpcRegion: region, // The region where the VPC is located
      },
    ],
  },
  {
    provider: awsProvider, // Specify the AWS provider for this resource
  }
);

/* 
 * Create a public Route 53 DNS zone for external domain resolution (e.g., 'brandon.com')
 * This zone can be accessed publicly and is also associated with the same VPC.
 */
const publicZone = new aws.route53.Zone(
  "dns-public-hosted-zone", // Name for the public DNS zone
  {
    name: dnsPublicDomain, // The domain name for the public zone
    vpcs: [
      {
        vpcId: eksVpc.vpcId, // The VPC ID to associate with the public DNS zone
        vpcRegion: region, // The region where the VPC is located
      },
    ],
  },
  {
    provider: awsProvider, // Use the AWS provider for this resource
  }
);

/* 
 * Create a wildcard SSL/TLS certificate for the internal domain (e.g., '*.int.brandon.com')
 * This certificate is used for securing subdomains under the private domain.
 */
const wildcardCertificate = new aws.acm.Certificate(
  "dns-int-wildcard-cert", // Name for the SSL certificate
  {
    domainName: `*.${dnsPrivateDomain}`, // Wildcard domain name for the certificate
    validationMethod: "DNS", // Validation method (DNS-based validation)
    subjectAlternativeNames: [dnsPrivateDomain], // Optional SAN (subject alternative name)
    tags: tags, // Add tags to the certificate resource
  },
  {
    provider: awsProvider, // Use the AWS provider for this resource
  }
);

// Export the ID of the private DNS zone for use in other parts of the project
export const privateZoneId = privateZone.zoneId;

// Export the ID of the public DNS zone for use in other parts of the project
export const publicZoneId = publicZone.zoneId;

// Export the ARN (Amazon Resource Name) of the wildcard SSL certificate for reference
export const wildcardCertificateArn = wildcardCertificate.arn;
