import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

const WHATSAPP_NUMERO = "555134160886";
const EMAIL_CONTATO = "contato@laboratoriodecozinha.com.br";

export default function Contato() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Contato | Laboratório de Cozinha";
    return () => { document.title = previousTitle; };
  }, []);

  const handleWhatsApp = () => {
    if (!nome.trim() || !mensagem.trim()) return;
    const texto = `*Contato - Laboratório de Cozinha*\n\nDe: ${nome.trim()}\nE-mail: ${email.trim() || "não informado"}\nMensagem: ${mensagem.trim()}`;
    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp aberto. Envie a mensagem na conversa para concluir o contato.");
  };

  return (
    <main className="min-h-screen" style={{ background: "#EDE0CC", color: "#3B4A2F" }}>
      <div className="max-w-2xl mx-auto px-5 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 hover:underline"
          style={{ color: "#7B2D00" }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </Link>

        <h1
          className="font-heading text-3xl md:text-4xl font-bold leading-tight mb-4"
          style={{ color: "#3B4A2F" }}
        >
          Fale com a equipe
        </h1>
        <p className="text-base mb-8" style={{ color: "#3B4A2F" }}>
          Tem dúvida sobre o Laboratório de Cozinha, precisa de ajuda com sua conta ou quer sugerir
          algo? Escolha o canal que preferir — respondemos o mais rápido possível.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg p-4 border"
            style={{ background: "#fff", borderColor: "#B5ABA3" }}
          >
            <MessageCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#3B4A2F" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "#3B4A2F" }}>WhatsApp</p>
              <p className="text-sm" style={{ color: "#7B2D00" }}>+55 (51) 3416-0886</p>
            </div>
          </a>
          <a
            href={`mailto:${EMAIL_CONTATO}`}
            className="flex items-start gap-3 rounded-lg p-4 border"
            style={{ background: "#fff", borderColor: "#B5ABA3" }}
          >
            <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#3B4A2F" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "#3B4A2F" }}>E-mail</p>
              <p className="text-sm break-all" style={{ color: "#7B2D00" }}>{EMAIL_CONTATO}</p>
            </div>
          </a>
        </div>

        <div className="rounded-lg p-6 border" style={{ background: "#fff", borderColor: "#B5ABA3" }}>
          <h2 className="font-heading text-lg font-semibold mb-4" style={{ color: "#3B4A2F" }}>
            Envie sua mensagem
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: "#3B4A2F" }}>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                style={{ borderColor: "#B5ABA3" }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: "#3B4A2F" }}>E-mail (opcional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                style={{ borderColor: "#B5ABA3" }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: "#3B4A2F" }}>Mensagem</label>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={5}
                placeholder="Como podemos ajudar?"
                className="w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 resize-none"
                style={{ borderColor: "#B5ABA3" }}
              />
            </div>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={!nome.trim() || !mensagem.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
              style={{ background: "#3B4A2F" }}
            >
              <Send className="w-4 h-4" /> Enviar pelo WhatsApp
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}