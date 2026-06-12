import sys

with open("src/app/(main)/membership/page.tsx", "rb") as f:
    data = f.read()

text = data.decode("utf-8", errors="replace")
lines = text.split("\n")

# Find all lines with U+FFFD
bad_lines = [(i+1, lines[i]) for i, l in enumerate(lines) if '\ufffd' in l]
print(f"Found {len(bad_lines)} lines with U+FFFD", file=sys.stderr)

# Fix them by line number
fix_map = {
    9:  "    label: '旗舰版',",
    16: "    label: '专业版',",
    23: "    desc: '卫浴电商客服管理全套工具 + 老板驾驶舱 + 知识资产',",
    30: "    label: '个人版',",
    37: "    label: '效能版',",
}

for lineno, old_line in bad_lines:
    if lineno in fix_map:
        lines[lineno-1] = fix_map[lineno]
        print(f"Fixed line {lineno}: {repr(fix_map[lineno])}", file=sys.stderr)
    else:
        print(f"WARNING: unknown fix for line {lineno}: {repr(old_line)[:80]}", file=sys.stderr)

fixed = "\n".join(lines)
with open("src/app/(main)/membership/page.tsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print("Done", file=sys.stderr)
