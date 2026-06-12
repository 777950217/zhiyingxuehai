#!/usr/bin/env python3
"""
批量修复AI API文件 - 添加服务器端使用次数检查
修复P0-1：AI使用次数跟踪从localStorage迁移到服务器端
"""
import re
import sys
from pathlib import Path

# 需要修改的AI API文件列表
AI_API_FILES = [
    "src/app/(main)/api/ai/knowledge-qa/route.ts",
    "src/app/(main)/api/ai/kpi/route.ts", 
    "src/app/(main)/api/ai/management-plan/route.ts",
    "src/app/(main)/api/ai/script/route.ts",
]

def fix_file(file_path: str) -> bool:
    """修复单个文件：添加import和check调用"""
    path = Path(file_path)
    if not path.exists():
        print(f"  ⚠️ 文件不存在: {file_path}")
        return False
    
    content = path.read_text(encoding='utf-8')
    original = content
    
    # 1. 添加 import { checkAndRecordAiUsage } from '@/lib/ai/check-usage';
    # 找到最后一个 import 语句，在其后添加
    import_pattern = r'^(import\s+.*?from\s+[\'"].*?[\'"];)$'
    imports = list(re.finditer(import_pattern, content, re.MULTILINE))
    
    if not imports:
        print(f"  ⚠️ 未找到import语句: {file_path}")
        return False
    
    # 在最后一个import后添加
    last_import = imports[-1]
    insert_pos = last_import.end()
    
    new_import = "\nimport { checkAndRecordAiUsage } from '@/lib/ai/check-usage';"
    
    # 检查是否已有这个import
    if 'checkAndRecordAiUsage' not in content:
        content = content[:insert_pos] + new_import + content[insert_pos:]
    
    # 2. 找到 POST 函数中的 request.json() 调用，在其后添加check
    # 匹配：const { ... } = await request.json();
    json_parse_pattern = r'(const\s+\{\s*[^}]+\s*\}\s*=\s*await\s*request\.json\(\);)'
    
    def add_check_after_json(match):
        """在request.json()后添加check调用"""
        var_decl = match.group(1)
        
        # 提取变量名（可能是 userId, user_id, id 等）
        # 简单提取第一个标识符
        check_code = f'''
        
      // ── AI使用次数检查（修复P0-1）──
      const userIdForCheck = {var_decl.split('{')[1].split('}')[0].split(',')[0].strip() if '{' in var_decl else 'userId'};
      if (userIdForCheck) {{
        const usageCheck = await checkAndRecordAiUsage(userIdForCheck, '{file_path.replace("src/app/(main)", "")}', userIdForCheck);
        if (usageCheck) {{
          return usageCheck;
        }}
      }}'''
        
        return var_decl + check_code
    
    # 使用正则替换，只在第一个request.json()后添加
    content_new = re.sub(json_parse_pattern, add_check_after_json, content, count=1)
    
    if content_new == content:
        print(f"  ⚠️ 未找到request.json()调用: {file_path}")
        # 尝试其他模式
        return False
    
    content = content_new
    
    # 写回文件
    path.write_text(content, encoding='utf-8')
    print(f"  ✅ 已修复: {file_path}")
    return True

def main():
    print("开始批量修复AI API文件...")
    print("=" * 60)
    
    success = 0
    for fp in AI_API_FILES:
        print(f"\n处理: {fp}")
        if fix_file(fp):
            success += 1
    
    print("\n" + "=" * 60)
    print(f"完成: {success}/{len(AI_API_FILES)} 个文件修复成功")

if __name__ == '__main__':
    main()
