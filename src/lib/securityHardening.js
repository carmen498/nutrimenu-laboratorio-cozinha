const APP_ID = "6a2b263c4c1cb1e47d54d8b7";
const OWNED_UPLOAD_PREFIX = `/api/apps/${APP_ID}/files/`;
const BLOCKED_NAV_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
  "chrome:",
  "chrome-extension:",
  "edge:",
  "moz-extension:",
]);

function assertFilePresent(file) {
  if (!file || typeof file.size !== "number") {
    throw new Error("Arquivo inválido.");
  }
}

export function validarImagemUpload(file, { maxBytes = 10 * 1024 * 1024 } = {}) {
  assertFilePresent(file);
  const type = String(file.type || "").toLowerCase();
  const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";

  if (file.size <= 0) throw new Error("O arquivo está vazio.");
  if (file.size > maxBytes) throw new Error("A imagem deve ter no máximo 10 MB.");
  if (!type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem válido.");

  // SVG/XML/HTML are active document formats, not passive raster photos. They
  // are deliberately rejected to reduce stored-XSS/content-sniffing surface.
  if (type === "image/svg+xml" || ["svg", "svgz", "xml", "html", "htm"].includes(ext)) {
    throw new Error("Formato não permitido. Use JPG, PNG, WEBP, HEIC ou outra imagem raster.");
  }

  return true;
}

export function validarCsvUpload(file, { maxBytes = 5 * 1024 * 1024 } = {}) {
  assertFilePresent(file);
  const ext = String(file.name || "").split(".").pop()?.toLowerCase();
  if (ext !== "csv") throw new Error("Selecione um arquivo .csv válido.");
  if (file.size <= 0) throw new Error("O arquivo CSV está vazio.");
  if (file.size > maxBytes) throw new Error("O arquivo CSV deve ter no máximo 5 MB.");
  return true;
}

export function validarDocumentoReceitaUpload(file, { maxBytes = 15 * 1024 * 1024 } = {}) {
  assertFilePresent(file);
  const ext = String(file.name || "").split(".").pop()?.toLowerCase();
  if (!["docx", "pdf", "txt"].includes(ext)) {
    throw new Error("Formato não suportado. Use .docx, .pdf ou .txt.");
  }
  if (file.size <= 0) throw new Error("O arquivo está vazio.");
  if (file.size > maxBytes) throw new Error("O arquivo deve ter no máximo 15 MB.");
  return true;
}

export function validarUrlArquivoDoApp(rawUrl) {
  if (!rawUrl) throw new Error("Upload não retornou URL do arquivo.");
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL de upload inválida.");
  }

  if (url.protocol !== "https:" || url.hostname !== "base44.app") {
    throw new Error("O arquivo enviado não pertence ao armazenamento autorizado do aplicativo.");
  }
  if (!url.pathname.startsWith(OWNED_UPLOAD_PREFIX)) {
    throw new Error("O arquivo enviado não pertence a este aplicativo.");
  }
  if (url.username || url.password) {
    throw new Error("URL de upload inválida.");
  }
  return url.toString();
}

export async function uploadImagemSeguro(base44, file, options) {
  validarImagemUpload(file, options);
  const result = await base44.integrations.Core.UploadFile({ file });
  return validarUrlArquivoDoApp(result?.file_url);
}

export async function uploadArquivoSeguro(base44, file, validator) {
  if (validator) validator(file);
  const result = await base44.integrations.Core.UploadFile({ file });
  return validarUrlArquivoDoApp(result?.file_url);
}

export function urlHttpsSegura(rawUrl, { allowedHosts = null } = {}) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (allowedHosts && !allowedHosts.includes(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function abrirUrlHttpsSegura(rawUrl, options) {
  const safe = urlHttpsSegura(rawUrl, options);
  if (!safe) return false;
  const win = window.open(safe, "_blank", "noopener,noreferrer");
  if (win) win.opener = null;
  return true;
}

export function caminhoInternoSeguro(rawPath, fallback = "/login") {
  if (!rawPath) return fallback;
  try {
    const url = new URL(rawPath, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    const path = url.pathname + url.search + url.hash;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

export function redirectOAuthSeguro(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const value = rawUrl.trim();
  if (!value || /[\u0000-\u001F\u007F\s]/.test(value)) return null;

  // Relative URLs are accepted only when they stay on this origin.
  if (value.startsWith("/")) return caminhoInternoSeguro(value, null);

  const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*:)/i);
  if (!schemeMatch) return null;
  const protocol = schemeMatch[1].toLowerCase();
  if (BLOCKED_NAV_PROTOCOLS.has(protocol)) return null;

  if (protocol === "http:" || protocol === "https:") {
    try {
      const url = new URL(value);
      if (url.username || url.password) return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  // Registered native-client schemes (for example cursor:// or myapp:/oauth)
  // are valid OAuth redirect targets. We allow non-browser executable schemes
  // after explicitly denying all active/dangerous browser protocols above.
  return value;
}

export function consoleErrorSeguro(label, error) {
  const status = error?.response?.status ?? error?.status;
  const code = error?.code;
  const message = String(error?.message || "Erro inesperado").slice(0, 300);
  const meta = { message };
  if (status != null) meta.status = status;
  if (code != null) meta.code = String(code).slice(0, 80);
  console.error(label, meta);
}
