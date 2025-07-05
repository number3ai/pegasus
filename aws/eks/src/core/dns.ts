/**
 * DNS Infrastructure
 * Route53 DNS zones and SSL certificates for the Pegasus EKS infrastructure
 */

import * as aws from "@pulumi/aws";

import { eksVpc } from "./networking";
import { REGION, dnsPrivateDomain, dnsPublicDomain, tags } from "../config/variables";

/**
 * Private Route53 DNS Zone
 * Creates a private hosted zone for internal domain resolution
 */
const privateZone = new aws.route53.Zone("dns-private-hosted-zone", {
  name: dnsPrivateDomain,
  vpcs: [
    {
      vpcId: eksVpc.vpcId,
      vpcRegion: REGION,
    },
  ],
  tags: {
    ...tags,
    Name: `${dnsPrivateDomain}-private-zone`,
    Purpose: "Internal DNS Resolution",
  },
});

/**
 * Public Route53 DNS Zone
 * Creates a public hosted zone for external domain resolution
 */
const publicZone = new aws.route53.Zone("dns-public-hosted-zone", {
  name: dnsPublicDomain,
  vpcs: [
    {
      vpcId: eksVpc.vpcId,
      vpcRegion: REGION,
    },
  ],
  tags: {
    ...tags,
    Name: `${dnsPublicDomain}-public-zone`,
    Purpose: "External DNS Resolution",
  },
});

/**
 * Wildcard SSL Certificate
 * Creates a wildcard certificate for the internal domain
 */
export const wildcardCertificate = new aws.acm.Certificate("dns-wildcard-cert", {
  domainName: `*.${dnsPrivateDomain}`,
  validationMethod: "DNS",
  subjectAlternativeNames: [dnsPrivateDomain],
  tags: {
    ...tags,
    Name: `${dnsPrivateDomain}-wildcard-cert`,
    Purpose: "Internal SSL Certificate",
  },
});

/**
 * DNS Zone Exports
 */
export const dnsExports = {
  privateZoneId: privateZone.zoneId,
  publicZoneId: publicZone.zoneId,
  wildcardCertificateArn: wildcardCertificate.arn,
};

/**
 * Create DNS records for services
 * @param zoneId - Route53 zone ID
 * @param records - Array of DNS record configurations
 */
export function createDNSRecords(
  zoneId: string,
  records: Array<{
    name: string;
    type: string;
    ttl: number;
    records: string[];
  }>
): aws.route53.Record[] {
  return records.map((record, index) =>
    new aws.route53.Record(`dns-record-${index}`, {
      zoneId,
      name: record.name,
      type: record.type,
      ttl: record.ttl,
      records: record.records,
    })
  );
}

/**
 * Create alias records for load balancers
 * @param zoneId - Route53 zone ID
 * @param aliases - Array of alias configurations
 */
export function createAliasRecords(
  zoneId: string,
  aliases: Array<{
    name: string;
    target: string;
    zoneId: string;
  }>
): aws.route53.Record[] {
  return aliases.map((alias, index) =>
    new aws.route53.Record(`alias-record-${index}`, {
      zoneId,
      name: alias.name,
      type: "A",
      aliases: [
        {
          name: alias.target,
          zoneId: alias.zoneId,
          evaluateTargetHealth: true,
        },
      ],
    })
  );
} 