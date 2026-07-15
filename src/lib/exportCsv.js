// Generic CSV export helper — UTF-8 without BOM, comma-separated, direct download.
// Read-only utility: never mutates any data, only formats it for download.

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}