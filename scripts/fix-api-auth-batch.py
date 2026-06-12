#!/usr/bin/env python3
"""
批量修复API端点认证问题。
为所有未认证的API端点添加 authenticateRequest + unauthorizedResponse 检查。
"""
import os
import re
import sys

# 不需要认证的公开端点路径关键词
PUBLIC_KEYWORDS = [
    'auth/register',
    'auth/login',
    'auth/reset-password',
    'auth/change-password',  # 改密码不需要先认证
    'certificate/',  # 证书查看是公开的
    'api/auth/',  # 所有auth相关端点暂不添加认证（注册/登录/重置密码）
]

def is_public_endpoint(file_path: str) -> bool:
    """检查是否为公开端点（不需要认证）"""
    for keyword in PUBLIC_KEYWORDS:
        if keyword in file_path:
            return True
    return False

def add_auth_to_file(file_path: str) -> bool:
    """为单个API文件添加认证检查，返回是否修改"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  [跳过] 无法读取 {file_path}: {e}")
        return False

    if 'authenticateRequest' in content:
        return False  # 已有认证，跳过

    # 检查是否有handler函数
    handler_pattern = r'export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)'
    handlers = re.findall(handler_pattern, content)
    if not handlers:
        print(f"  [跳过] 无handler函数: {file_path}")
        return False

    # 添加import
    import_line = "import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth';"
    # 在第一个import之后添加
    first_import_end = content.find('\n', content.find('import '))
    if first_import_end == -1:
        print(f"  [跳过] 找不到import: {file_path}")
        return False

    new_content = content[:first_import_end+1] + import_line + '\n' + content[first_import_end+1:]

    # 为每个handler函数添加认证检查
    # 查找 "export async function HANDLER_NAME(request: NextRequest" 或类似模式
    # 然后在函数体开始处（第一个{之后）添加认证代码

    # 使用更精确的模式：匹配函数签名行
    func_pattern = r'(export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s*\([^)]*\))'

    def add_auth_to_handler(match):
        func_sig = match.group(0)
        # 找到函数体开始的大括号
        # 在func_sig之后找第一个{
        rest = new_content[match.end():]
        brace_idx = rest.find('{')
        if brace_idx == -1:
            return func_sig  # 找不到大括号，跳过

        # 在大括号之后添加认证代码
        insert_pos = match.end() + brace_idx + 1

        # 检查是否已经添加了认证（避免重复）
        # 看插入位置之后100个字符内是否有 authenticateRequest
        check_region = new_content[insert_pos:insert_pos+200]
        if 'authenticateRequest' in check_region:
            return func_sig  # 已有认证，跳过

        auth_code = """
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
"""
        return new_content[match.start():insert_pos] + auth_code + new_content[insert_pos:]

    # 需要重新查找，因为new_content已经改变了
    # 改用循环方式处理
    lines = new_content.split('\n')
    result_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        result_lines.append(line)

        # 检查这一行是否是handler函数签名
        match = re.match(r'\s*export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s*\(', line)
        if match:
            # 找函数体开始的大括号
            brace_count = 0
            j = i
            found_brace = False
            while j < len(lines):
                brace_count += lines[j].count('{') - lines[j].count('}')
                if '{' in lines[j]:
                    found_brace = True
                    # 在函数体开始后添加认证代码（下一行）
                    # 检查下一行是否已经有认证
                    if j + 1 < len(lines) and 'authenticateRequest' in lines[j+1]:
                        break  # 已有认证，跳过
                    # 插入认证代码
                    indent = len(lines[j+1]) - len(lines[j+1].lstrip()) if j+1 < len(lines) else 2
                    auth_lines = [
                        ' ' * indent + 'const auth = await authenticateRequest(request);',
                        ' ' * indent + 'if (!auth) return unauthorizedResponse();',
                    ]
                    # 找到函数体开始的下一行插入
                    next_j = j + 1
                    while next_j < len(lines) and '{' in lines[next_j] and next_j == j + 1:
                        next_j += 1
                    # 简化：直接在j+1位置插入
                    lines = lines[:j+1] + [''] + auth_lines + [''] + lines[j+1:]
                    i = j + len(auth_lines) + 3  # 跳过插入的行
                    break
                j += 1
            else:
                i += 1
                continue
            continue
        i += 1

    new_content = '\n'.join(lines)

    # 写回文件
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    except Exception as e:
        print(f"  [错误] 写入失败 {file_path}: {e}")
        return False

def main():
    api_dir = '/c/Users/10512/WorkBuddy/Claw/zhiyingxuehai/src/app/(main)/api'
    print(f"扫描API目录: {api_dir}")

    # 查找所有route.ts文件
    route_files = []
    for root, dirs, files in os.walk(api_dir):
        for f in files:
            if f == 'route.ts':
                route_files.append(os.path.join(root, f))

    print(f"找到 {len(route_files)} 个API路由文件")

    # 分类
    public_files = []
    already_fixed = []
    need_fix = []

    for f in route_files:
        if is_public_endpoint(f):
            public_files.append(f)
        elif 'authenticateRequest' in open(f, 'r', encoding='utf-8', errors='ignore').read():
            already_fixed.append(f)
        else:
            need_fix.append(f)

    print(f"公开端点（跳过）: {len(public_files)}")
    print(f"已修复（跳过）: {len(already_fixed)}")
    print(f"需要修复: {len(need_fix)}")
    print()

    # 修复文件
    fixed = 0
    skipped = 0
    for f in need_fix:
        print(f"修复: {f}")
        if add_auth_to_file(f):
            fixed += 1
            print(f"  [成功]")
        else:
            skipped += 1
            print(f"  [跳过]")

    print()
    print(f"完成: 修复 {fixed} 个文件，跳过 {skipped} 个文件")

if __name__ == '__main__':
    main()
