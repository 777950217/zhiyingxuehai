const fs = require('fs');
const https = require('https');

async function fetchRemoteVersion(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP status ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data.trim()); });
    }).on('error', reject);
  });
}

async function verifyDeploy(remoteUrl) {
  const localVersion = fs.readFileSync('public/deploy-test.txt', 'utf8').trim();
  console.log(`[verify-deploy] Local version: ${localVersion}`);
  
  try {
    const remoteVersion = await fetchRemoteVersion(`${remoteUrl}/deploy-test.txt`);
    console.log(`[verify-deploy] Remote version: ${remoteVersion}`);
    
    if (localVersion === remoteVersion) {
      console.log('[verify-deploy] ✅ Deployment verified: versions match');
      return { success: true, localVersion, remoteVersion };
    } else {
      console.log('[verify-deploy] ❌ Deployment failed: versions do not match');
      console.log(`  Expected: ${localVersion}`);
      console.log(`  Got:      ${remoteVersion}`);
      return { success: false, localVersion, remoteVersion };
    }
  } catch (error) {
    console.log(`[verify-deploy] ❌ Failed to fetch remote version: ${error.message}`);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  const remoteUrl = process.argv[2] || 'https://zhiyingxuehai.vercel.app';
  verifyDeploy(remoteUrl).then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { verifyDeploy };