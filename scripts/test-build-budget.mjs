import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const ASSETS = path.join(DIST, "assets");

const LIMITS = {
  entryJsBytes: 650 * 1024,
  anyJsBytes: 650 * 1024,
  cssBytes: 180 * 1024,
  totalJsBytes: 3.2 * 1024 * 1024,
  singleImageBytes: 250 * 1024,
};

function fileSize(file) {
  return fs.statSync(file).size;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

assert.ok(fs.existsSync(path.join(DIST, "index.html")), "dist/index.html ausente — execute npm run build antes do budget");
assert.ok(fs.existsSync(ASSETS), "dist/assets ausente — build incompleto");

const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const entryMatch = html.match(/<script[^>]+src="([^"]+\.js)"[^>]*><\/script>/i);
assert.ok(entryMatch, "bundle JS de entrada não encontrado em dist/index.html");

const entryPath = path.join(DIST, entryMatch[1].replace(/^\//, ""));
assert.ok(fs.existsSync(entryPath), `bundle de entrada referenciado não existe: ${entryMatch[1]}`);

const files = fs.readdirSync(ASSETS).map((name) => ({
  name,
  size: fileSize(path.join(ASSETS, name)),
}));

const jsFiles = files.filter((f) => f.name.endsWith(".js"));
const cssFiles = files.filter((f) => f.name.endsWith(".css"));
const imageFiles = files.filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name));

const entrySize = fileSize(entryPath);
const largestJs = jsFiles.reduce((a, b) => (a.size > b.size ? a : b));
const largestCss = cssFiles.length ? cssFiles.reduce((a, b) => (a.size > b.size ? a : b)) : { name: "n/a", size: 0 };
const largestImage = imageFiles.length ? imageFiles.reduce((a, b) => (a.size > b.size ? a : b)) : { name: "n/a", size: 0 };
const totalJs = jsFiles.reduce((sum, file) => sum + file.size, 0);

assert.ok(entrySize <= LIMITS.entryJsBytes, `bundle de entrada excedeu ${kb(LIMITS.entryJsBytes)}: ${kb(entrySize)}`);
assert.ok(largestJs.size <= LIMITS.anyJsBytes, `chunk JS excedeu ${kb(LIMITS.anyJsBytes)}: ${largestJs.name} (${kb(largestJs.size)})`);
assert.ok(largestCss.size <= LIMITS.cssBytes, `CSS excedeu ${kb(LIMITS.cssBytes)}: ${largestCss.name} (${kb(largestCss.size)})`);
assert.ok(totalJs <= LIMITS.totalJsBytes, `JS total excedeu ${kb(LIMITS.totalJsBytes)}: ${kb(totalJs)}`);
assert.ok(largestImage.size <= LIMITS.singleImageBytes, `imagem individual excedeu ${kb(LIMITS.singleImageBytes)}: ${largestImage.name} (${kb(largestImage.size)})`);
assert.equal(files.some((f) => f.name.endsWith(".map")), false, "source map encontrado em dist/assets; não publicar mapas por padrão");

console.log("OK: orçamento de build aprovado.");
console.log(`INFO: entry=${kb(entrySize)}; maior JS=${largestJs.name} ${kb(largestJs.size)}; JS total=${kb(totalJs)}.`);
console.log(`INFO: maior CSS=${largestCss.name} ${kb(largestCss.size)}; maior imagem=${largestImage.name} ${kb(largestImage.size)}.`);
