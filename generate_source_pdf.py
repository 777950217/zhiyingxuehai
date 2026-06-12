#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成软著申请用的源代码PDF
"""

import os
from fpdf import FPDF

# 源代码目录
SOURCE_DIR = '/workspace/projects/软著源代码'
OUTPUT_FILE = '/workspace/projects/软著源代码.pdf'
# 使用英文页眉避免字体问题
HEADER_TEXT = 'ZhiYingXueHai E-commerce Customer Service Management System V1.0 Source Code'
LINES_PER_PAGE = 50
FRONT_PAGES = 30
BACK_PAGES = 30

def get_all_source_files():
    """获取所有源代码文件，按目录排序"""
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.css']
    files = []
    for root, dirs, filenames in os.walk(SOURCE_DIR):
        for filename in filenames:
            if any(filename.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, filename)
                files.append(filepath)
    return sorted(files)

def read_file_content(filepath):
    """读取文件内容"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.readlines()
    except Exception as e:
        return [f'// Error reading file: {str(e)}\n']

def main():
    print("开始生成源代码PDF...")
    
    # 获取所有源文件
    files = get_all_source_files()
    print(f"找到 {len(files)} 个源代码文件")
    
    # 合并所有代码行
    all_lines = []
    for filepath in files:
        # 添加文件分隔注释
        rel_path = os.path.relpath(filepath, SOURCE_DIR)
        all_lines.append(f'// ========== {rel_path} ==========\n')
        content = read_file_content(filepath)
        all_lines.extend(content)
        all_lines.append('\n')
    
    total_lines = len(all_lines)
    print(f"总代码行数: {total_lines}")
    
    # 取前1500行 + 后1500行
    front_lines = LINES_PER_PAGE * FRONT_PAGES  # 1500
    back_lines = LINES_PER_PAGE * BACK_PAGES    # 1500
    
    if total_lines <= front_lines + back_lines:
        # 总行数不足，取全部
        selected_lines = all_lines
        print(f"总行数不足，取全部 {total_lines} 行")
    else:
        # 取前1500行 + 后1500行
        selected_lines = all_lines[:front_lines]
        selected_lines.append('\n')
        selected_lines.append('// ========== 中间代码省略 ==========\n')
        omitted = total_lines - front_lines - back_lines
        selected_lines.append(f'// 省略 {omitted} 行代码\n')
        selected_lines.append('// ========== 中间代码省略 ==========\n')
        selected_lines.append('\n')
        selected_lines.extend(all_lines[-back_lines:])
        print(f"取前 {front_lines} 行 + 后 {back_lines} 行，省略 {omitted} 行")
    
    # 创建PDF
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # 使用内置字体（支持基本ASCII）
    pdf.set_font('Courier', size=8)
    
    # 计算页数
    total_pdf_lines = len(selected_lines)
    total_pages = (total_pdf_lines + LINES_PER_PAGE - 1) // LINES_PER_PAGE
    
    print(f"PDF总行数: {total_pdf_lines}, 预计页数: {total_pages}")
    
    # 逐页生成
    line_idx = 0
    page_num = 1
    
    while line_idx < total_pdf_lines:
        pdf.add_page()
        
        # 页眉
        pdf.set_font('Courier', 'B', 10)
        pdf.cell(0, 8, HEADER_TEXT, align='C', ln=True)
        pdf.ln(2)
        
        # 页码
        pdf.set_font('Courier', size=8)
        pdf.cell(0, 5, f'Page {page_num} / {total_pages}', align='R', ln=True)
        pdf.ln(3)
        
        # 代码内容
        pdf.set_font('Courier', size=7)
        page_lines = 0
        while line_idx < total_pdf_lines and page_lines < LINES_PER_PAGE:
            line = selected_lines[line_idx]
            # 清理行内容
            line = line.rstrip('\n\r')
            # 替换非ASCII字符为?
            safe_line = ''
            for ch in line:
                if ord(ch) < 128:
                    safe_line += ch
                else:
                    safe_line += '?'
            # 截断过长行
            if len(safe_line) > 100:
                safe_line = safe_line[:100] + '...'
            
            pdf.cell(0, 4, safe_line, ln=True)
            line_idx += 1
            page_lines += 1
        
        page_num += 1
    
    # 保存PDF
    pdf.output(OUTPUT_FILE)
    print(f"PDF已保存到: {OUTPUT_FILE}")
    print(f"总页数: {page_num - 1}")

if __name__ == '__main__':
    main()
