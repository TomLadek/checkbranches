const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile(filePath) {
  const envData = fs.readFileSync(filePath, 'utf8');
  const envVars = {};
  envData
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Skip empty lines and comments
      .forEach(line => {
        const [key, ...valueParts] = line.split('=');
        envVars[key.trim()] = valueParts.join('=').trim();
      });
  return envVars;
}

// Load environment variables
const envFilePath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envFilePath)) {
  console.error(`ERROR: .env file not found at ${envFilePath}`);
  process.exit(1);
}
const env = loadEnvFile(envFilePath);

// Environment variables
const CSV_FILE = env.BRANCHLIST_CSV_PATH;
const TEMP_FILE = path.join(path.dirname(CSV_FILE), 'tempfile.csv');
const GIT_USER = env.GIT_USER;
const GIT_TOKEN = env.GIT_PW;
const GIT_PATH = env.GIT_REMOTE;

// Function to read the CSV and parse its contents
function readCsvFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.trim().split('\n');
  const header = lines[0];
  const entries = lines.slice(1).map(line => {
    const [repo, branch, person] = line.split(',');
    return { repo, branch, person };
  });
  return { header, entries };
}

// Function to write updated CSV data
function writeCsvFile(filePath, header, entries) {
  const data = [header, ...entries.map(e => `${e.repo},${e.branch},${e.person}`)].join('\n');
  fs.writeFileSync(filePath, data, 'utf8');
}

// Function to group branches by repository
function groupBranchesByRepo(entries) {
  const grouped = {};
  for (const entry of entries) {
    if (!grouped[entry.repo]) {
      grouped[entry.repo] = [];
    }
    grouped[entry.repo].push(entry.branch);
  }
  return grouped;
}

// Function to check branches in a single repository
function checkBranchesForRepo(repo, branches) {
  const refs = branches.map(branch => `refs/heads/${branch}`).join(' ');
  const url = `https://${GIT_USER}:${GIT_TOKEN}@${GIT_PATH}${repo}`;
  let output;

  try {
    output = execSync(`git ls-remote --heads ${url} ${refs}`, { encoding: 'utf8' });
  } catch (err) {
    console.error(`ERROR: Failed to connect to Git server for repository "${repo}".`);
    throw err; // Abort the script on any error
  }

  const existingRefs = new Set(
      output
          .trim()
          .split('\n')
          .map(line => line.split('\t')[1])
          .filter(Boolean)
  );

  return branches.map(branch => ({
    branch,
    exists: existingRefs.has(`refs/heads/${branch}`),
  }));
}

// Main script logic
function main() {
  try {
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`ERROR: CSV file ${CSV_FILE} not found.`);
      process.exit(1);
    }

    const { header, entries } = readCsvFile(CSV_FILE);
    const grouped = groupBranchesByRepo(entries);

    const updatedEntries = [];

    for (const [repo, branches] of Object.entries(grouped)) {
      console.log(`\nChecking branches for repository: ${repo}`);
      const results = checkBranchesForRepo(repo, branches);

      for (const entry of entries.filter(e => e.repo === repo)) {
        const result = results.find(r => r.branch === entry.branch);
        if (result?.exists) {
          console.log(`${entry.repo}/${entry.branch} still exists!`);
          updatedEntries.push(entry);
        } else {
          console.log(`${entry.repo}/${entry.branch} is gone`);
        }
      }
    }

    writeCsvFile(TEMP_FILE, header, updatedEntries);

    // Replace the original file with the updated file
    fs.renameSync(TEMP_FILE, CSV_FILE);
    console.log('CSV file updated successfully.');
  } catch (err) {
    console.error('Aborting script due to an error:', err.message);
    if (fs.existsSync(TEMP_FILE)) {
      fs.unlinkSync(TEMP_FILE); // Clean up temp file if it exists
    }
    process.exit(1); // Exit with a non-zero code
  }
}

main();
