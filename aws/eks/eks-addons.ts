import * as fs from 'fs';

fs.readdirSync("./eks-addons")
  .filter(file => file.endsWith(".ts")) // Only process TypeScript files
  .forEach(async file => {
    // Dynamically import the module
    await import(`./eks-addons/${file.replace('.ts', '')}`);
  });

