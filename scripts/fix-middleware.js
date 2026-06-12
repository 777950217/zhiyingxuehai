const fs = require('fs');
const path = require('path');

const middlewareDir = '.next/server';
const middlewarePath = path.join(middlewareDir, 'middleware.js');
const nftPath = path.join(middlewareDir, 'middleware.js.nft.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function fixMiddleware() {
  console.log('[fix-middleware] Checking middleware files...');
  
  ensureDir(middlewareDir);
  
  // 创建空的 middleware.js
  if (!fs.existsSync(middlewarePath)) {
    const content = 'export default function(){}';
    fs.writeFileSync(middlewarePath, content, 'utf8');
    console.log('[fix-middleware] Created middleware.js');
  } else {
    console.log('[fix-middleware] middleware.js already exists');
  }
  
  // 创建空的 middleware.js.nft.json
  if (!fs.existsSync(nftPath)) {
    const content = JSON.stringify({ version: 1, files: [] });
    fs.writeFileSync(nftPath, content, 'utf8');
    console.log('[fix-middleware] Created middleware.js.nft.json');
  } else {
    console.log('[fix-middleware] middleware.js.nft.json already exists');
  }
  
  console.log('[fix-middleware] Done');
}

if (require.main === module) {
  fixMiddleware();
}

module.exports = { fixMiddleware };