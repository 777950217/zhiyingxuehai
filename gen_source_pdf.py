#!/usr/bin/env python3
"""
生成软著申请用的源代码PDF
"""

import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

SOURCE_DIR = "/workspace/projects/软著源代码"
OUTPUT_PDF = "/workspace/projects/软著材料/源代码.pdf"
HEADER_TEXT = "职盈学海电商客服管理系统V1.0 源程序代码"
LINES_PER_PAGE = 50
TAKE_LINES = 1500  # 前后各取1500行

def find_source_files():
    """找出所有源代码文件并按路径排序"""
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.mjs', '.yaml']
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
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.readlines()
    except Exception as e:
        return [f"// Error reading file: {e}\n"]

def collect_all_lines(files):
    """收集所有源代码行"""
    all_lines = []
    for filepath in files:
        # 添加文件标题
        rel_path = os.path.relpath(filepath, SOURCE_DIR)
        all_lines.append(f"{'='*60}")
        all_lines.append(f"文件: {rel_path}")
        all_lines.append(f"{'='*60}")
        # 读取文件内容
        content = read_file_content(filepath)
        all_lines.extend([line.rstrip() for line in content])
        all_lines.append("")  # 空行分隔
    return all_lines

def draw_page(c, lines, page_num, total_pages, width, height):
    """绘制一页"""
    # 页眉
    c.setFont('Helvetica', 10)
    c.drawCentredString(width/2, height - 15*mm, HEADER_TEXT)
    
    # 页码
    c.drawRightString(width - 15*mm, height - 15*mm, f"第 {page_num} 页 / 共 {total_pages} 页")
    
    # 分隔线
    c.line(15*mm, height - 18*mm, width - 15*mm, height - 18*mm)
    
    # 代码内容
    y = height - 25*mm
    c.setFont('Courier', 8)
    
    for line in lines:
        if y < 20*mm:
            break
        # 截断过长的行
        if len(line) > 90:
            line = line[:87] + "..."
        c.drawString(15*mm, y, line)
        y -= 4*mm  # 行高4mm

def main():
    print("开始生成源代码PDF...")
    
    # 找出所有源文件
    files = find_source_files()
    print(f"找到 {len(files)} 个源代码文件")
    
    # 收集所有代码行
    all_lines = collect_all_lines(files)
    total_lines = len(all_lines)
    print(f"总代码行数: {total_lines}")
    
    # 取前后各1500行
    if total_lines <= TAKE_LINES * 2:
        selected_lines = all_lines
        omitted = 0
    else:
        front_lines = all_lines[:TAKE_LINES]
        back_lines = all_lines[-TAKE_LINES:]
        omitted = total_lines - TAKE_LINES * 2
        # 中间添加省略标注
        selected_lines = front_lines + [
            "",
            "=" * 60,
            f"... 省略中间 {omitted} 行代码 ...",
            "=" * 60,
            ""
        ] + back_lines
    
    print(f"取前 {TAKE_LINES} 行 + 后 {TAKE_LINES} 行，省略 {omitted} 行")
    
    # 计算页数
    total_pages = (len(selected_lines) + LINES_PER_PAGE - 1) // LINES_PER_PAGE
    print(f"总页数: {total_pages}")
    
    # 创建PDF
    width, height = A4
    c = canvas.Canvas(OUTPUT_PDF, pagesize=A4)
    
    # 逐页绘制
    for page_num in range(1, total_pages + 1):
        start_idx = (page_num - 1) * LINES_PER_PAGE
        end_idx = min(start_idx + LINES_PER_PAGE, len(selected_lines))
        page_lines = selected_lines[start_idx:end_idx]
        
        draw_page(c, page_lines, page_num, total_pages, width, height)
        c.showPage()
    
    c.save()
    print(f"PDF已保存到: {OUTPUT_PDF}")
    print(f"文件大小: {os.path.getsize(OUTPUT_PDF) / 1024:.1f} KB")

if __name__ == '__main__':
    main()
