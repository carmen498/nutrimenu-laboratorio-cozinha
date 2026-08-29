import { useState, useMemo, useRef, useEffect } from "react";
import { HelpCircle, X, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { resolveHelpContent } from "@/lib/resolveHelpContent";
import { consoleErrorSeguro } from "@/lib/securityHardening";

export default function HelpPanel({ screenName = "", open: openProp, onOpenChange, focusFaqsSignal = 0 }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = onOpenChange || setOpenState;
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const answerRef = useRef(null);
  const scrollRef = useRef(null);
  const faqsRef = useRef(null);

  useEffect(() => {
    if (answer && answerRef.current && scrollRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [answer]);

  // Quando o botão "Ajuda com X" é clicado, leva direto para a seção de FAQ (em vez do topo do painel).
  useEffect(() => {
    if (focusFaqsSignal > 0 && open && faqsRef.current) {
      faqsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusFaqsSignal, open]);

  const content = useMemo(() => resolveHelpContent(screenName), [screenName]);

  const handleAsk = async () => {
    if (!question.trim()) { setQuestionError("Escreva sua dúvida para continuar."); return; }
    if (question.trim().length < 10) { setQuestionError("Descreva sua dúvida com mais detalhes para eu conseguir ajudar."); return; }
    if (loading) return;
    setQuestionError("");
    setLoading(true);
    setAnswer("");
    try {
      const ctxInfo = content?.context ? `Contexto da tela: ${content.context}` : "";
      const produtoAtual = screenName?.startsWith("Custos —") ? "Laboratório de Custos" : "Laboratório de Cozinha";
      const systemPrompt = `Você é a assistente do ${produtoAtual}. O usuário está na tela ${screenName || "do app"}. ${ctxInfo} Responda em português brasileiro de forma direta e prática. REGRA: apenas oriente o usuário a criar uma receita quando ele mencionar explicitamente o nome de uma receita para cadastrar — nunca sugira criar receitas de forma proativa.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `[System: ${systemPrompt}]\n\nPergunta do usuário: ${question}`,
        model: "automatic",
      });
      const textoResposta = typeof res === "string" ? res : (res?.response || res?.text || res?.content || JSON.stringify(res));
      setAnswer(textoResposta || "Não foi possível obter uma resposta. Tente reformular a pergunta.");
    } catch (err) {
      consoleErrorSeguro("HelpPanel ask error", err);
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
          open ? "translate-x-0 visible" : "translate-x-full invisible pointer-events-none"
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Context */}
          {content?.context && (
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.context}</p>
            </div>
          )}

          {/* FAQs */}
          {content?.faqs?.length > 0 && (
            <div ref={faqsRef}>
              <h3 className="text-sm font-semibold text-foreground mb-2">Perguntas frequentes</h3>
              <div className="space-y-1">
                {content.faqs.map((faq, idx) => (
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
          )}

          {/* Answer */}
          {answer && (
            <div ref={answerRef} className="bg-muted/50 rounded-lg p-3 border border-border">
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
            onChange={(e) => { setQuestion(e.target.value); setQuestionError(""); }}
            rows={3}
            className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 resize-none ${questionError ? "border-red-400 focus-visible:ring-red-400" : "border-input focus-visible:ring-ring"}`}
          />
          {questionError && (
            <p className="text-xs text-red-600 mt-1">{questionError}</p>
          )}
          <Button
            className="w-full mt-2 gap-1"
            style={{ backgroundColor: "#1B4332", opacity: !question.trim() || loading ? 0.5 : 1 }}
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