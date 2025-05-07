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

// Step 1: Read all package.json files and their current versions
const packagesDir = path.join(__dirname, "../packages");
const type = process.argv[2] || "patch";
const packages = {};

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

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  packages[pkg.name] = {
    path: pkgJsonPath,
    currentVersion: pkg.version,
    newVersion: bump(pkg.version, type),
    json: pkg,
  };
});

// Step 2: Update versions in each package.json
Object.keys(packages).forEach((packageName) => {
  const pkg = packages[packageName];
  const pkgJson = pkg.json;

  // Update the package's own version
  pkgJson.version = pkg.newVersion;

  // Update dependencies that reference other packages in our workspace
  const dependencyTypes = ["dependencies", "devDependencies", "peerDependencies"];

  dependencyTypes.forEach((depType) => {
    if (!pkgJson[depType]) {
      return;
    }

    Object.keys(pkgJson[depType]).forEach((dependency) => {
      // If this is one of our packages, update its version
      if (packages[dependency]) {
        pkgJson[depType][dependency] = `^${packages[dependency].newVersion}`;
      }
    });
  });

  // Write updated package.json back to file
  fs.writeFileSync(pkg.path, JSON.stringify(pkgJson, null, 2) + "\n");
  console.log(`✅ Bumped ${packageName} from ${pkg.currentVersion} to ${pkg.newVersion}`);
});

// Log a summary
console.log("\n📦 Summary of version bumps:");
Object.keys(packages).forEach((name) => {
  console.log(`  ${name}: ${packages[name].currentVersion} → ${packages[name].newVersion}`);
});
