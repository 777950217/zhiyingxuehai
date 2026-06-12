import sys

# Read the damaged file
with open("src/app/(main)/membership/page.tsx", "rb") as f:
    data = f.read()

# Decode with error replacement
text = data.decode("utf-8", errors="replace")
lines = text.split("\n")

# Find and fix lines containing U+FFFD (replacement character)
fixed_count = 0
for i, line in enumerate(lines):
    if '\ufffd' in line:
        print(f"Line {i+1} has U+FFFD: {repr(line)}")
        # Fix known bad lines
        if "旗舰" in line or "旗舰" in line or "旗舰" in line:
            lines[i] = "    label: '旗舰版',"
            fixed_count += 1
            print(f"  -> Fixed to: {repr(lines[i])}")
        elif "专业" in line or "专业" in line or "专业" in line:
            lines[i] = "    label: '专业版',"
            fixed_count += 1
            print(f"  -> Fixed to: {repr(lines[i])}")
        elif "个人" in line or "个人" in line or "个人" in line:
            # Line 22 probably: "    label: '个人版',"
            lines[i] = "    label: '个人版',"
            fixed_count += 1
            print(f"  -> Fixed to: {repr(lines[i])}")
        elif "效能" in line or "效能" in line or "效能" in line:
            lines[i] = "    label: '效能版',"
            fixed_count += 1
            print(f"  -> Fixed to: {repr(lines[i])}")
        else:
            print(f"  WARNING: Don't know how to fix line {i+1}")

# Write back as proper UTF-8
fixed = "\n".join(lines)
with open("src/app/(main)/membership/page.tsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print(f"\nTotal fixed: {fixed_count} lines")
print("File saved as UTF-8")
