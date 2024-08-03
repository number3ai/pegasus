import * as aws from "@pulumi/aws";

import { eksVpc } from "./eks";
import { awsProvider } from "./providers";

import { dnsPrivateDomain, dnsPublicDomain, region, tags } from "./variables";

// Create a private DNS zone 'int.brandon.com'
const privateZone = new aws.route53.Zone("dns-int-hosted-zone", {
    name: dnsPrivateDomain,
    vpcs: [{
        vpcId: eksVpc.vpcId,  
        vpcRegion: region,
    }],
}, { provider: awsProvider });

// Create a public DNS zone 'brandon.com'
const publicZone = new aws.route53.Zone("dns-public-hosted-zone", {
    name: dnsPublicDomain,
    vpcs: [{
        vpcId: eksVpc.vpcId,  
        vpcRegion: region,
    }],
}, { provider: awsProvider });

// Define a wildcard SSL/TLS certificate for int.brandon.com
const wildcardCertificate = new aws.acm.Certificate("dns-int-wildcard-cert", {
    domainName: `*.${dnsPrivateDomain}`,
    validationMethod: "DNS",
    subjectAlternativeNames: [dnsPrivateDomain],  // Optionally include additional SANs if needed
    tags: tags,
}, { provider: awsProvider });

// Export the IDs of the created zones for reference
export const privateZoneId = privateZone.zoneId;
export const publicZoneId = publicZone.zoneId;

// Export the ARN of the wildcard certificate for reference
export const wildcardCertificateArn = wildcardCertificate.arn;
