import { useState } from "react";
import { HelpCircle, X, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const faqs = [
  {
    q: "O que é per capita?",
    a: "Per capita é a quantidade média de alimento pronto para consumo por pessoa, expressa em gramas. Os valores desta tabela são baseados na POF IBGE 2017-2018 e referências de UAN.",
  },
  {
    q: "Como criar uma receita?",
    a: "Vá em Receitas > Nova Receita. Você pode criar manualmente ou colar o texto da receita e usar a IA para estruturar automaticamente ingredientes e quantidades.",
  },
  {
    q: "Como funciona o cálculo de custo?",
    a: "O custo é calculado automaticamente a partir do preço dos ingredientes cadastrados. Ao editar o preço de um ingrediente dentro de uma receita, o preço do ingrediente no banco também é atualizado.",
  },
  {
    q: "Como montar um cardápio?",
    a: "Em Cardápios, crie um novo cardápio e selecione as receitas. O sistema calcula automaticamente as quantidades totais e o custo com base no número de pessoas.",
  },
  {
    q: "O que são ingredientes estruturais e 'a gosto'?",
    a: "Ingredientes estruturais escalam proporcionalmente com o número de porções (ex: arroz, carne). Ingredientes 'a gosto' têm quantidade fixa (ex: sal, pimenta).",
  },
  {
    q: "Como funciona a lista de compras?",
    a: "A partir de um cardápio, o sistema gera automaticamente a lista de compras com as quantidades necessárias de cada ingrediente. Você pode marcar o que já tem em casa.",
  },
];

export default function HelpPanel({ screenName = "" }) {
  const [open, setOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const systemPrompt = `Você é a assistente do app Laboratório de Cozinha. O usuário está na tela ${screenName || "do app"}. Responda em português brasileiro de forma direta e prática.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `[System: ${systemPrompt}]\n\nPergunta do usuário: ${question}`,
        model: "claude_sonnet_4_6",
      });
      setAnswer(res || "Não foi possível obter uma resposta.");
    } catch {
      setAnswer("Ocorreu um erro ao consultar o assistente. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 md:bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-all mb-14 md:mb-0"
        style={{ backgroundColor: "#1B4332" }}
        title="Ajuda"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <HelpCircle className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full z-40 bg-card shadow-2xl border-l border-border transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "360px", maxWidth: "100vw" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg font-bold text-primary">Central de Ajuda</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Context */}
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bem-vinda ao <strong className="text-foreground">Laboratório de Cozinha</strong>, sua plataforma de gastronomia planejada. 
              Aqui você gerencia receitas, calcula custos automaticamente, monta cardápios e organiza suas compras — tudo integrado 
              com tabelas de per capita baseadas em dados oficiais brasileiros.
            </p>
          </div>

          {/* FAQs */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Perguntas frequentes</h3>
            <div className="space-y-1">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-border rounded-lg">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <span className="text-left pr-2">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                        expandedFaq === idx ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Answer */}
          {answer && (
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          )}
        </div>

        {/* Ask question */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <textarea
            placeholder="Tem alguma dúvida? Escreva aqui..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
          <Button
            className="w-full mt-2 gap-1"
            style={{ backgroundColor: "#1B4332" }}
            disabled={!question.trim() || loading}
            onClick={handleAsk}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Pensando...</> : "Perguntar"}
          </Button>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 hidden md:block"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}