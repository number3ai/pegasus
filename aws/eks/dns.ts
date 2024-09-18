import * as aws from "@pulumi/aws"; // Import AWS resources from Pulumi
import { eksVpc } from "./eks"; // Import VPC details from the EKS module
import { awsProvider } from "./providers"; // Import AWS provider configuration
import { dnsPrivateDomain, dnsPublicDomain, region, tags } from "./variables"; // Import necessary variables

// Create a private Route 53 DNS zone for internal domain resolution
const privateZone = new aws.route53.Zone(
  "dns-int-hosted-zone", // Resource name
  {
    name: dnsPrivateDomain, // Domain name for the private zone
    vpcs: [
      {
        vpcId: eksVpc.vpcId, // Associate with the VPC ID
        vpcRegion: region, // Region of the VPC
      },
    ],
  },
  {
    provider: awsProvider, // Specify AWS provider
  }
);

// Create a public Route 53 DNS zone for external domain resolution
const publicZone = new aws.route53.Zone(
  "dns-public-hosted-zone", // Resource name
  {
    name: dnsPublicDomain, // Domain name for the public zone
    vpcs: [
      {
        vpcId: eksVpc.vpcId, // Associate with the VPC ID
        vpcRegion: region, // Region of the VPC
      },
    ],
  },
  {
    provider: awsProvider, // Specify AWS provider
  }
);

// Create a wildcard SSL/TLS certificate for the internal domain
export const wildcardCertificate = new aws.acm.Certificate(
  "dns-int-wildcard-cert", // Resource name
  {
    domainName: `*.${dnsPrivateDomain}`, // Wildcard domain name
    validationMethod: "DNS", // DNS-based validation
    subjectAlternativeNames: [dnsPrivateDomain], // Optional SAN
    tags, // Tags for the certificate
  },
  {
    provider: awsProvider, // Specify AWS provider
  }
);

// Export the IDs of the private and public DNS zones
export const privateZoneId = privateZone.zoneId;
export const publicZoneId = publicZone.zoneId;

// Export the ARN of the wildcard SSL certificate
export const wildcardCertificateArn = wildcardCertificate.arn;
