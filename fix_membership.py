import sys

# Read the damaged file
with open("src/app/(main)/membership/page.tsx", "rb") as f:
    data = f.read()

# Decode with error replacement to see the content
text = data.decode("utf-8", errors="replace")
lines = text.split("\n")

# Fix line 9 (index 8): should be "    label: '旗舰版',"
lines[8] = "    label: '旗舰版',"

# Fix line 10-12 if needed
# Line 10: "    color: 'text-amber-700'," - should be OK
# Line 11: "    bg: 'bg-amber-50 border-amber-200'," - should be OK  
# Line 12: "    icon: Crown," - should be OK

# Write back as proper UTF-8
fixed = "\n".join(lines)
with open("src/app/(main)/membership/page.tsx", "w", encoding="utf-8") as f:
    f.write(fixed)

print("File fixed and saved as UTF-8")
