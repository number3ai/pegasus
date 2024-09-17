import * as fs from 'fs';
import * as pulumi from '@pulumi/pulumi';

const directoryPath = './eks-addons'; 
const files = fs.readdirSync(directoryPath);

files
  .filter(file => file.endsWith('.ts')) // Only process TypeScript files
  .map(async file => {
    // Dynamically import the module

    pulumi.log.info(`Importing: ${file}`);
    pulumi.log.info(`Module: ${file.replace('.ts', '')}`);
    await import(`./eks-addons/${file.replace('.ts', '')}`);
  });

