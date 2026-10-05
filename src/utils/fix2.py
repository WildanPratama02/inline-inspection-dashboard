import os

path = r"d:\inline-inspection-dashboard\src\utils\excelExportUtils.js"
with open(path, "r", encoding='utf8') as f:
    c = f.read()

c = c.replace(r"\${escapeXml(finalDefNameStr)}", "${escapeXml(finalDefNameStr)}")
c = c.replace(r"\${finalDefQty}", "${finalDefQty}")

with open(path, "w", encoding="utf8") as f:
    f.write(c)
