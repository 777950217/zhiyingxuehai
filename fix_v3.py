import sys

with open("src/app/(main)/membership/page.tsx", "rb") as f:
    data = f.read()

text = data.decode("utf-8", errors="replace")
lines = text.split("\n")

# Fix known bad lines by line number (1-indexed from build error)
# Line 9: should be "    label: '旗舰版',"
# Line 16: should be "    label: '专业版',"
if len(lines) >= 9:
    lines[8] = "    label: '旗舰版',"
if len(lines) >= 16:
    lines[15] = "    label: '专业版',"

fixed = "\n".join(lines)
with open("src/app/(main)/membership/page.tsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print("Fixed lines 9 and 16")
