import * as fs from 'fs';
import * as pulumi from '@pulumi/pulumi';

fs.readdirSync("./eks-addons")
  .filter(file => file.endsWith(".ts")) // Only process TypeScript files
  .forEach(async file => {
    // Dynamically import the module

    if (file.replace('.ts', '') === "grafana") {pulumi.log.info(`${file.replace('.ts', '')}: importing Module`);}
    await import(`./eks-addons/${file.replace('.ts', '')}`);
  });

