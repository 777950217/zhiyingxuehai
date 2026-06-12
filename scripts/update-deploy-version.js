const fs = require('fs');

function updateDeployVersion() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const version = `deploy-${timestamp}`;
  
  fs.writeFileSync('public/deploy-test.txt', version, 'utf8');
  console.log(`[deploy-version] Updated to: ${version}`);
  
  return version;
}

if (require.main === module) {
  updateDeployVersion();
}

module.exports = { updateDeployVersion };