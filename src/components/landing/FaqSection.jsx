import React from "react";

const FAQ = [
  { q: "Preciso saber de tecnologia para usar?", a: "Não. Se você usa WhatsApp, você usa o Laboratório de Cozinha. É simples, visual e funciona no celular." },
  { q: "Funciona para quem cozinha só em casa?", a: "Sim. Seja para planejar a semana da família ou para um jantar especial — o app funciona para qualquer escala." },
  { q: "Posso usar para precificar meus produtos artesanais?", a: "Sim. O módulo de custos calcula ingredientes, insumos e margem, e sugere o preço por porção ou unidade." },
  { q: "O app ajuda a organizar congelamento e produção em lote?", a: "Sim. Você organiza seu freezer e estoque dentro do app, sabendo exatamente o que já produziu, o que precisa repor e quando cada item foi congelado." },
  { q: "Consigo exportar minhas receitas e listas de compras?", a: "Sim. Receitas, fichas técnicas e listas de compras podem ser exportadas em PDF ou Excel a qualquer momento." },
  { q: "O app tem conteúdo de apoio, além das ferramentas?", a: "Sim. Você conta com uma Central de Ajuda dentro da plataforma e com as Dicas da Carmen — orientações práticas de cozinha profissional, direto na tela, no momento em que você mais precisa." },
  { q: "Como funciona o cancelamento?", a: "Não existe assinatura recorrente para cancelar. Cada plano vale pelo período contratado (30 dias ou anual) e não renova sozinho — você decide quando (e se) quer continuar, sem precisar cancelar nada." },
  { q: "Tem período de teste?", a: "Sim — 7 dias de acesso completo, sem pedir cartão de crédito." },
  { q: "Como funciona o pagamento?", a: "Você pode pagar com cartão de crédito ou PIX, processado com segurança pelo Mercado Pago." },
  { q: "Posso usar o app pelo celular?", a: "Sim. O Laboratório de Cozinha funciona direto no navegador do celular, sem precisar instalar nada." },
  { q: "Se eu tiver dúvida, como falo com vocês?", a: "Direto pelo WhatsApp de suporte, com resposta de quem realmente conhece a plataforma." },
];

export default function FaqSection() {
  return (
    <section className="lc-section">
      <div className="lc-container lc-container--narrow">
        <div className="lc-section-head">
          <p className="lc-eyebrow">Dúvidas frequentes</p>
          <h2 className="lc-title">Perguntas e respostas</h2>
        </div>
        <div className="lc-faq-list">
          {FAQ.map((item) => (
            <details className="lc-faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <div className="lc-faq-a">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}