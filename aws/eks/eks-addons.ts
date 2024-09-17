import * as fs from 'fs';

// Directory containing TypeScript files
const addonsDir = "./eks-addons";

// Read and process TypeScript files from the directory
fs.readdirSync(addonsDir)
  .filter(file => file.endsWith(".ts")) // Filter to process only TypeScript files
  .forEach(async file => {
    // Dynamically import the module
    await import(`${addonsDir}/${file.replace(".ts", "")}`);
  });
