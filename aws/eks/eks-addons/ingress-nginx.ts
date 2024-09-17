import { wildcardCertificate as role } from "../dns";

export const valueFile = role.arn.apply(arn => {
  return {
    fileName: "ingress-nginx",
    json: {
      "ingress-nginx": {
        controller: {
          service: {
            annotations: {
              "alb.ingress.kubernetes.io/actions.ssl-redirect":
                JSON.stringify({
                  Type: "redirect",
                  RedirectConfig: {
                    Protocol: "HTTPS",
                    Port: "443",
                    StatusCode: "HTTP_301",
                  },
                }),
              "alb.ingress.kubernetes.io/backend-protocol": "HTTPS",
              "alb.ingress.kubernetes.io/certificate-arn": arn,
              "alb.ingress.kubernetes.io/listen-ports": JSON.stringify([
                { HTTP: 80 },
                { HTTPS: 443 },
              ]),
              "alb.ingress.kubernetes.io/proxy-body-size": "0",
              "alb.ingress.kubernetes.io/scheme": "internal",
              "alb.ingress.kubernetes.io/ssl-policy":
                "ELBSecurityPolicy-FS-1-2-Res-2020-10",
              "alb.ingress.kubernetes.io/ssl-redirect": "443",
              "alb.ingress.kubernetes.io/target-type": "ip",
              "kubernetes.io/ingress.class": "alb",
              "service.beta.kubernetes.io/aws-load-balancer-backend-protocol":
                "http",
              "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout":
                "3600",
              "service.beta.kubernetes.io/aws-load-balancer-ssl-cert": arn,
              "service.beta.kubernetes.io/aws-load-balancer-ssl-ports":
                "https",
            },
          },
        },
      },
    },
  };
});
