const fs = require('fs');
const file = 'src/app/(main)/after-sales/product-videos/[modelId]/[versionId]/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('onUploadProgress:')) {
    let j = i;
    while (j < lines.length && !lines[j].includes('},')) {
      j++;
    }
    if (i > 0 && lines[i-1].trim().endsWith(',')) {
      lines[i-1] = lines[i-1].replace(/,$/, '');
    }
    lines.splice(i, j - i + 1);
    break;
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed onUploadProgress in', file);
