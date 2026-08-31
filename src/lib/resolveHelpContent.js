import { helpContent } from "@/lib/helpContent";

// Resolve o conteúdo de ajuda (context + faqs) da seção correspondente ao nome de tela atual.
// Faz correspondência exata primeiro, e cai para correspondência parcial (ex.: "Medidas Caseiras" -> "Medidas").
export function resolveHelpContent(screenName) {
  if (screenName === "Refeição") screenName = "Refeições";
  const exact = helpContent[screenName];
  if (exact) return { key: screenName, ...exact };
  if (screenName) {
    for (const [key, val] of Object.entries(helpContent)) {
      if (screenName.startsWith(key) || key.startsWith(screenName)) return { key, ...val };
    }
  }
  return null;
}