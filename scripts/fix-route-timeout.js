const fs = require('fs');
const path = 'C:/Users/10512/WorkBuddy/Claw/zhiyingxuehai/src/app/(main)/api/ai/diagnose/route.ts';
let content = fs.readFileSync(path, 'utf8');

// 删除超时控制代码（第1377-1381行附近）
// 找到 '// ⚠️ P0修复' 到 'const stream = new ReadableStream' 之间的内容，删除
const startIdx = content.indexOf('// ⚠️ P0修复');
if (startIdx !== -1) {
  const endIdx = content.indexOf('const stream = new ReadableStream', startIdx);
  if (endIdx !== -1) {
    // 删除从 startIdx 到 endIdx 的内容（保留 'const stream' 那行）
    content = content.slice(0, startIdx) + '\n  ' + content.slice(endIdx);
  }
}

// 修复 client.stream() 调用：去掉第三个参数 abortController
const streamCallIdx = content.indexOf('client.stream(messages, {');
if (streamCallIdx !== -1) {
  // 找到 }, abortController) 并替换为 })
  const abortIdx = content.indexOf(', abortController)', streamCallIdx);
  if (abortIdx !== -1) {
    content = content.slice(0, abortIdx) + '}' + content.slice(abortIdx + ', abortController)'.length);
  }
}

// 删除 clearTimeout(timeoutId) 行（如果存在）
const clearIdx = content.indexOf('clearTimeout(timeoutId)');
if (clearIdx !== -1) {
  // 找到这一行的开始（上一个换行符）
  const lineStart = content.lastIndexOf('\n', clearIdx);
  const lineEnd = content.indexOf('\n', clearIdx);
  if (lineStart !== -1 && lineEnd !== -1) {
    content = content.slice(0, lineStart) + content.slice(lineEnd);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('OK: route.ts fixed, timeout code removed');
