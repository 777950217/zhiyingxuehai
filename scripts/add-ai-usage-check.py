#!/usr/bin/env python3
"""
批量修改AI API文件，添加服务器端使用次数检查
修复P0-1：AI使用次数跟踪从localStorage迁移到服务器端
"""
import re
import sys
from pathlib import Path

# 7个AI API文件路径
AI_API_FILES = [
    "src/app/(main)/api/ai/diagnose/route.ts",
    "src/app/(main)/api/ai/generate/route.ts",
    "src/app/(main)/api/ai/knowledge-qa/route.ts",
    "src/app/(main)/api/ai/kpi/route.ts",
    "src/app/(main)/api/ai/management-plan/route.ts",
    "src/app/(main)/api/ai/script/route.ts",
]

def add_usage_check_to_file(file_path: str) -> bool:
    """给单个AI API文件添加使用次数检查"""
    path = Path(file_path)
    if not path.exists():
        print(f"  ⚠️ 文件不存在: {file_path}")
        return False
    
    content = path.read_text(encoding='utf-8')
    original_content = content
    
    # 1. 添加import（在getSupabaseClient import之后）
    # 找到最后一个import行，在其后添加
    import_pattern = r"(import \{ [^\}]*getSupabaseClient[^\}]* \} from [^\n]+)"
    import_replacement = r"\1\nimport { checkAndRecordAiUsage } from '@/lib/ai/check-usage';"
    
    # 更简单的做法：找到包含"getSupabaseClient"的import行，在其后添加
    lines = content.split('\n')
    new_lines = []
    import_added = False
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        # 如果这一行包含getSupabaseClient的import，且下一行不是我们要添加的import
        if 'getSupabaseClient' in line and 'checkAndRecordAiUsage' not in line and not import_added:
            # 检查下一行是否已经是我们要添加的import
            if i + 1 < len(lines) and 'checkAndRecordAiUsage' in lines[i + 1]:
                continue  # 已经添加过了
            new_lines.append("import { checkAndRecordAiUsage } from '@/lib/ai/check-usage';")
            import_added = True
    
    if not import_added:
        print(f"  ⚠️ 未找到getSupabaseClient import，无法添加checkAndRecordAiUsage import: {file_path}")
        return False
    
    content = '\n'.join(new_lines)
    
    # 2. 在POST函数中添加checkAndRecordAiUsage调用
    # 找到 "const { " 或 "const{" 后面跟着 "request.json()" 的行
    # 然后在该行之后添加check调用
    
    # 匹配模式：const { ... } = await request.json();
    post_check_pattern = r"(const \{ [^\}]+ \} = await request\.json\(\);)"
    
    def add_check_after_json_parse(match):
        var_name = match.group(1)
        # 提取userId变量名（通常是userId或user_id）
        # 检查是否有userId变量
        check_code = f"""
        
      // ── AI使用次数检查（修复P0-1）──
      const userIdForCheck = {var_name}.userId || {var_name}.user_id || {var_name}.id;
      if (userIdForCheck) {{
        const usageCheck = await checkAndRecordAiUsage(userIdForCheck, '{file_path.replace('src/app/(main)', '')}', {var_name}.query || {var_name}.question || '');
        if (usageCheck) {{
          return usageCheck; // 429 超限错误
        }}
      }}
"""
        return var_name + check_code
    
    # 使用正则替换
    content_new = re.sub(post_check_pattern, add_check_after_json_parse, content, count=1)
    
    if content_new == content:
        print(f"  ⚠️ 未找到request.json()调用，无法添加check调用: {file_path}")
        return False
    
    content = content_new
    
    # 写回文件
    path.write_text(content, encoding='utf-8')
    print(f"  ✅ 已修改: {file_path}")
    return True

def main():
    print("开始批量修改AI API文件，添加服务器端使用次数检查...")
    print("=" * 60)
    
    success_count = 0
    for file_path in AI_API_FILES:
        print(f"\n处理: {file_path}")
        if add_usage_check_to_file(file_path):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"完成: {success_count}/{len(AI_API_FILES)} 个文件修改成功")

if __name__ == '__main__':
    main()
