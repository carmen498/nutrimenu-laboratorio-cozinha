// Imprime um elemento do DOM em um iframe isolado, sem nunca tocar na rota,
// histórico de navegação ou estado da página principal do app.
// Isso garante que abrir/exportar o PDF nunca quebra a navegação (ex: botão Voltar)
// da tela por trás, independentemente do comportamento do diálogo nativo de impressão
// do navegador (Safari, Chrome, WebViews, etc.).
export function printarElementoIsolado(elementId, extraPrintCss = "") {
  const el = document.getElementById(elementId);
  if (!el) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const headHTML = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("\n");

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head>${headHTML}<style>body{margin:0;}${extraPrintCss}</style></head><body>${el.outerHTML}</body></html>`);
  doc.close();

  iframe.onload = () => {
    // pequeno atraso para garantir que fontes/estilos externos carreguem no iframe
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        cleanup();
      }
    }, 350);
  };
}