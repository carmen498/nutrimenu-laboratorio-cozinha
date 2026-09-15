// Generic CSV export helper — UTF-8 without BOM, comma-separated, direct download.
// Read-only utility: never mutates any data, only formats it for download.

import { paraIsoBrasilia } from "@/lib/fusoBrasilia";

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const str = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(value))
    ? paraIsoBrasilia(value)
    : String(value);
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

// Variante para Excel-pt: separador ponto e vírgula + BOM UTF-8.
function escapeCsvValueSemicolon(value) {
  if (value === null || value === undefined) return "";
  const str = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(value))
    ? paraIsoBrasilia(value)
    : String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCsvSemicolonBom(filename, headers, rows) {
  const lines = [
    headers.join(";"),
    ...rows.map((row) => row.map(escapeCsvValueSemicolon).join(";")),
  ];
  // BOM (\uFEFF) garante que o Excel reconheça UTF-8 e não quebre acentos.
  const csvContent = "\uFEFF" + lines.join("\r\n");
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