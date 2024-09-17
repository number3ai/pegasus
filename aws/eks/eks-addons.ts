import * as fs from 'fs';

const directoryPath = './eks-addons'; 
const files = fs.readdirSync(directoryPath);

files
  .filter(file => file.endsWith('.ts')) // Only process TypeScript files
  .map(async file => {
    // Dynamically import the module
    await import(`./eks-addons/${file.replace('.ts', '')}`);
  });

