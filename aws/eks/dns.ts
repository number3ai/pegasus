import * as aws from "@pulumi/aws";

import { vpc } from "./eks";
import { awsProvider } from "./providers";
import { dnsPrivateDomain, dnsPublicDomain, region } from "./variables";

// Create a private DNS zone 'int.brandon.com'
const privateZone = new aws.route53.Zone("dns-int-hosted-zone", {
    name: dnsPrivateDomain,
    vpcs: [{
        vpcId: vpc.vpcId,  
        vpcRegion: region,
    }],
}, { provider: awsProvider });

// Create a public DNS zone 'brandon.com'
const publicZone = new aws.route53.Zone("dns-public-hosted-zone", {
    name: dnsPublicDomain,
    vpcs: [{
        vpcId: vpc.vpcId,  
        vpcRegion: region,
    }],
}, { provider: awsProvider });

// Define a wildcard SSL/TLS certificate for int.brandon.com
const wildcardCertificate = new aws.acm.Certificate("dns-int-wildcard-cert", {
    domainName: `*.dnsPrivateDomain`,
    validationMethod: "DNS",
    subjectAlternativeNames: ["int.brandon.com"],  // Optionally include additional SANs if needed
    tags: {
        Name: "Wildcard Certificate for int.brandon.com",
    },
}, { provider: awsProvider });

// Export the IDs of the created zones for reference
export const privateZoneId = privateZone.zoneId;
export const publicZoneId = publicZone.zoneId;

// Export the ARN of the wildcard certificate for reference
export const wildcardCertificateArn = wildcardCertificate.arn;
