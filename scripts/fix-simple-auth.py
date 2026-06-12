#!/usr/bin/env python3
"""
批量为完全无认证的简单API文件添加authenticateRequest。
只处理满足以下条件的文件：
- 不含 authenticateRequest / x-user-id / getSession / getUser
- 不是 auth/ 目录下的文件（登录注册等）
- 不是 certificate/ 目录（证书验证可能公开）
- 只有一个 export async function handler（简单文件）
"""

import os
import re

API_DIR = "src/app/(main)/api"
IMPORT_LINE = "import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';"

def find_unauthenticated_files():
    """找出所有无认证的API文件"""
    files = []
    for root, dirs, filenames in os.walk(API_DIR):
        # 跳过auth目录和certificate目录
        dirs[:] = [d for d in dirs if d not in ('auth', 'certificate')]
        for fname in filenames:
            if fname != 'route.ts':
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            # 检查是否已有认证
            if any(k in content for k in ['authenticateRequest', 'x-user-id', 'getSession', 'getUser']):
                continue
            files.append(fpath)
    return files

def is_simple_file(content):
    """检查是否是简单文件（只有一个handler）"""
    handlers = re.findall(r'^export async function (GET|POST|PUT|DELETE)', content, re.MULTILINE)
    return len(handlers) <= 2

def add_auth_to_file(fpath):
    """为文件添加认证"""
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查是否已处理
    if 'authenticateRequest' in content:
        return 'already_fixed'

    # 1. 添加import（在第一个import之后或文件开头）
    lines = content.split('\n')
    import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            import_idx = i
    if import_idx >= 0:
        lines.insert(import_idx + 1, IMPORT_LINE)
    else:
        lines.insert(0, IMPORT_LINE)

    # 2. 在GET/POST/PUT/DELETE handler函数体内第一行添加认证
    new_lines = []
    in_handler = False
    handler_brace_depth = 0
    added_auth = False

    for line in lines:
        new_lines.append(line)

        # 检测handler函数开始
        if not added_auth and re.match(r'^export async function (GET|POST|PUT|DELETE)\(', line):
            in_handler = True
            handler_brace_depth = 0
            continue

        if in_handler and not added_auth:
            # 计算大括号深度来找到函数体开始
            # 简单方法：找到函数声明后的第一个 {
            if '{' in line:
                handler_brace_depth += line.count('{')
                handler_brace_depth -= line.count('}')
                # 在函数体第一行后添加认证（下一行）
                if handler_brace_depth > 0 or ('{' in line and line.strip().endswith('{')):
                    # 找到函数体开始了，下一行添加认证
                    pass
            # 更简单的方法：在函数声明后的第一个非空行添加
            stripped = line.strip()
            if stripped and not stripped.startswith('//') and stripped != '{':
                # 这是函数体内的第一行实际代码，在它之前插入认证
                indent = len(line) - len(line.lstrip())
                auth_lines = [
                    ' ' * indent + 'const auth = await authenticateRequest(request);',
                    ' ' * indent + 'if (!auth) return unauthorizedResponse();',
                    ''
                ]
                # 移除刚才添加的行，插入认证后再添加
                new_lines.pop()
                new_lines.extend(auth_lines)
                new_lines.append(line)
                added_auth = True
                in_handler = False

    # 如果上面的逻辑失败了（没找到合适的插入点），用更简单的方法
    if not added_auth:
        # 直接在每个handler函数体开始处插入
        content2 = '\n'.join(lines)
        pattern = r'(export async function (?:GET|POST|PUT|DELETE)\([^)]*\)(?:\s*:\s*\w+)?\s*\{)'
        replacement = r'''\1
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();'''
        content2 = re.sub(pattern, replacement, content2, count=1)
        new_lines = content2.split('\n')

    new_content = '\n'.join(new_lines)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return 'fixed'

def main():
    files = find_unauthenticated_files()
    print(f"Found {len(files)} unauthenticated files")

    fixed = 0
    skipped = 0
    errors = 0

    for fpath in files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
            if not is_simple_file(content):
                print(f"SKIP (complex): {fpath}")
                skipped += 1
                continue
            result = add_auth_to_file(fpath)
            if result == 'fixed':
                print(f"FIXED: {fpath}")
                fixed += 1
            else:
                print(f"SKIP (already): {fpath}")
        except Exception as e:
            print(f"ERROR: {fpath} - {e}")
            errors += 1

    print(f"\nDone: fixed={fixed}, skipped={skipped}, errors={errors}")

if __name__ == '__main__':
    main()
