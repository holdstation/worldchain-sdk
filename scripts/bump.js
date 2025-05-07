const fs = require("fs");
const path = require("path");

/**
 * Bumps a semantic version based on type (major, minor, patch)
 * @param {string} version - Current version in format "x.y.z"
 * @param {string} type - "major", "minor", or "patch" 
 * @returns {string} Bumped version
 */
const bump = (version, type) => {
  const [major, minor, patch] = version.split(".").map(Number);
  
  if (type === "major") {
    return `${major + 1}.0.0`;
  }

  if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  
  return `${major}.${minor}.${patch + 1}`;
};

// Get the bump type from command line arguments
const type = process.argv[2] || "patch";

// Step 1: Read root package.json and determine the new version
const rootDir = path.join(__dirname, "..");
const rootPkgJsonPath = path.join(rootDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgJsonPath, "utf-8"));
const currentVersion = rootPkg.version;
const newVersion = bump(currentVersion, type);

// Update root package.json version
rootPkg.version = newVersion;
fs.writeFileSync(rootPkgJsonPath, JSON.stringify(rootPkg, null, 2) + "\n");
console.log(`✅ Bumped root package from ${currentVersion} to ${newVersion}`);

// Step 2: Update all child packages to use the same version
const packagesDir = path.join(__dirname, "../packages");
const updatedPackages = [];

fs.readdirSync(packagesDir).forEach((pkgName) => {
  const pkgPath = path.join(packagesDir, pkgName);
  const stat = fs.statSync(pkgPath);

  // Skip non-directories and hidden files
  if (!stat.isDirectory() || pkgName.startsWith(".")) {
    return;
  }

  const pkgJsonPath = path.join(pkgPath, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    return;
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const packageName = pkgJson.name;
  const packageCurrentVersion = pkgJson.version;

  // Update the package's own version to match root
  pkgJson.version = newVersion;

  // Update dependencies that reference other packages in our workspace
  const dependencyTypes = ["dependencies", "devDependencies", "peerDependencies"];
  dependencyTypes.forEach((depType) => {
    if (!pkgJson[depType]) {
      return;
    }

    Object.keys(pkgJson[depType]).forEach((dependency) => {
      // If this dependency name starts with our project's scope/naming
      // (assuming packages are in same workspace/organization)
      if (dependency.startsWith("@worldchain/") || updatedPackages.includes(dependency)) {
        pkgJson[depType][dependency] = `^${newVersion}`;
      }
    });
  });

  // Write updated package.json back to file
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
  updatedPackages.push(packageName);
  console.log(`✅ Updated ${packageName} from ${packageCurrentVersion} to ${newVersion}`);
});

// Log a summary
console.log("\n📦 Summary:");
console.log(`  All packages updated to version ${newVersion}`);
