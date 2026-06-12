const fs = require('fs');
const filePath = process.argv[2] || 'route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. 在 'let fullContent = "";' 后添加超时控制代码
const insertAfter = 'let fullContent = "";';
const timeoutCode = `\n\n  // ⚠️ P0修复：添加15秒超时控制，防止AI服务卡死导致页面无限等待\n  const abortController = new AbortController();\n  const timeoutId = setTimeout(() => {\n    abortController.abort(new Error('AI响应超时（15秒）'));\n  }, 15000);`;

let idx = content.indexOf(insertAfter);
if (idx === -1) { console.log('ERROR: insert point not found'); process.exit(1); }
content = content.slice(0, idx + insertAfter.length) + timeoutCode + content.slice(idx + insertAfter.length);

// 2. 修改 client.stream() 调用，添加 abortController 参数
// 找到 'client.stream(messages, {' 的位置
const streamIdx = content.indexOf('client.stream(messages,');
if (streamIdx === -1) { console.log('ERROR: stream call not found'); process.exit(1); }

// 找到 '})' 的位置（stream调用的结尾，闭合options对象）
const afterStreamCall = content.indexOf('});', streamIdx);
if (afterStreamCall === -1) { console.log('ERROR: stream call end not found'); process.exit(1); }

// 在 '});' 之前插入 ', abortController'
content = content.slice(0, afterStreamCall) + ', abortController' + content.slice(afterStreamCall);

// 3. 在第一个 '} catch' 之前添加 clearTimeout
const catchIdx = content.indexOf('} catch', streamIdx);
if (catchIdx === -1) { console.log('ERROR: catch block not found'); process.exit(1); }

const clearCode = '\n          clearTimeout(timeoutId);\n';
content = content.slice(0, catchIdx) + clearCode + content.slice(catchIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('OK: route.ts updated with timeout control');
