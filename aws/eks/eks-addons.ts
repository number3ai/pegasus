import * as fs from 'fs';
import * as pulumi from '@pulumi/pulumi';

fs.readdirSync("./eks-addons")
  .filter(file => file.endsWith(".ts")) // Only process TypeScript files
  .forEach(async file => {
    // Dynamically import the module

    pulumi.log.info(`Importing: ${file}`);
    pulumi.log.info(`Module: ${file.replace('.ts', '')}`);
    await import(`./eks-addons/${file.replace('.ts', '')}`);
  });

