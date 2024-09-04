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

import * as aws from "@pulumi/aws";

import { eksVpc } from "./eks";
import { awsProvider } from "./providers";

import { dnsPrivateDomain, dnsPublicDomain, region, tags } from "./variables";

// Create a private DNS zone 'int.brandon.com'
const privateZone = new aws.route53.Zone(
  "dns-int-hosted-zone",
  {
    name: dnsPrivateDomain,
    vpcs: [
      {
        vpcId: eksVpc.vpcId,
        vpcRegion: region,
      },
    ],
  },
  {
    provider: awsProvider,
  }
);

// Create a public DNS zone 'brandon.com'
const publicZone = new aws.route53.Zone(
  "dns-public-hosted-zone",
  {
    name: dnsPublicDomain,
    vpcs: [
      {
        vpcId: eksVpc.vpcId,
        vpcRegion: region,
      },
    ],
  },
  {
    provider: awsProvider,
  }
);

// Define a wildcard SSL/TLS certificate for int. domain
const wildcardCertificate = new aws.acm.Certificate(
  "dns-int-wildcard-cert",
  {
    domainName: `*.${dnsPrivateDomain}`,
    validationMethod: "DNS",
    subjectAlternativeNames: [dnsPrivateDomain], // Optionally include additional SANs if needed
    tags: tags,
  },
  {
    provider: awsProvider,
  }
);

// Export the IDs of the created zones for reference
export const privateZoneId = privateZone.zoneId;
export const publicZoneId = publicZone.zoneId;

// Export the ARN of the wildcard certificate for reference
export const wildcardCertificateArn = wildcardCertificate.arn;
