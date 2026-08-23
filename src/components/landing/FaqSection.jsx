import React from "react";

const FAQ = [
  { q: "Preciso saber de tecnologia para usar?", a: "Não. Se você usa WhatsApp, você usa o Laboratório de Cozinha. É simples, visual e funciona no celular." },
  { q: "Funciona para quem cozinha só em casa?", a: "Sim. Seja para planejar a semana da família ou para um jantar especial — o app funciona para qualquer escala." },
  { q: "Posso usar para precificar meus produtos artesanais?", a: "Sim. O módulo de custos calcula ingredientes, insumos e margem, e sugere o preço por porção ou unidade." },
  { q: "O app ajuda a organizar congelamento e produção em lote?", a: "Sim, nas duas frentes. Para produção em lote, você escalona qualquer receita para a quantidade que vai produzir — o app recalcula ingredientes, peso e porções — e o Relatório de Pré-preparos mostra, por cardápio ou evento, quanto de cada item deixar pronto antes, em peso líquido e bruto, já com fator de correção. Para congelamento, as receitas que congelam bem ficam marcadas com as tags Congelável e Freezer, dá para filtrar por elas, e as Dicas da Carmen têm uma trilha inteira sobre o tema — de quem fundou uma empresa de alimentação." },
  { q: "Consigo exportar minhas receitas e listas de compras?", a: "Sim. Receitas, fichas técnicas, listas de compras, orçamentos e pré-preparos podem ser exportados em PDF a qualquer momento — prontos para imprimir e levar à bancada." },
  { q: "O app tem conteúdo de apoio, além das ferramentas?", a: "Sim. Você conta com uma Central de Ajuda dentro da plataforma e com as Dicas da Carmen — orientações práticas de cozinha profissional, direto na tela, no momento em que você mais precisa." },
  { q: "Como funciona o cancelamento?", a: "Não existe assinatura recorrente para cancelar. Cada plano vale pelo período contratado (30 dias ou anual) e não renova sozinho — você decide quando (e se) quer continuar, sem precisar cancelar nada." },
  { q: "Quanto custa renovar depois do 1º ano?", a: "A renovação do plano anual está prevista em R$ 99,00 à vista (ou em até 6x de R$ 16,50) — metade do valor do 1º ano, como benefício de fidelidade, e o compromisso está registrado nos nossos Termos de Uso. Ela fica disponível para contratação a partir do 2º ano de uso contínuo, e continua sem renovação automática: você escolhe se quer renovar." },
  { q: "Tem período de teste?", a: "Sim — 7 dias de acesso completo, sem pedir cartão de crédito." },
  { q: "Como funciona o pagamento?", a: "Você pode pagar com cartão de crédito ou PIX, processado com segurança pelo Mercado Pago." },
  { q: "Posso usar o app pelo celular?", a: "Sim. O Laboratório de Cozinha funciona direto no navegador do celular, sem precisar instalar nada." },
  { q: "Se eu tiver dúvida, como falo com vocês?", a: "Direto pelo WhatsApp de suporte, com resposta de quem realmente conhece a plataforma." },
];

export default function FaqSection() {
  return (
    <section className="lc-section" id="faq">
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