import sys

with open("src/app/(main)/membership/page.tsx", "rb") as f:
    data = f.read()

text = data.decode("utf-8", errors="replace")
lines = text.split("\n")

fix_map = {
    9:  "    label: '旗舰版',",
    13: "    desc: '卫浴电商客服管理全套工具 + 老板驾驶舱 + 知识资产',",
    16: "    label: '专业版',",
    20: "    desc: '完整团队管理工具，五度淬判体系 + AI 分析',",
    23: "    desc: '卫浴电商客服管理全套工具 + 老板驾驶舱 + 知识资产',",
    30: "    label: '个人版',",
    37: "    label: '效能版',",
    38: "  // 版本判断：staff 角色只可能是企业版（专业版/旗舰版），默认旗舰版",
    82: "                    {new Date(expiresAt) > new Date() ? '' : '（已过期）'}",
}

for lineno, new_line in fix_map.items():
    if lineno <= len(lines):
        old = lines[lineno-1]
        lines[lineno-1] = new_line
        print(f"Line {lineno}: {repr(old)[:60]} -> {repr(new_line)[:60]}", file=sys.stderr)

fixed = "\n".join(lines)
with open("src/app/(main)/membership/page.tsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print("All fixed", file=sys.stderr)
