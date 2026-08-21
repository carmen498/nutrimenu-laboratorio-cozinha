import React from "react";

export default function FinalCtaSection() {
  return (
    <section className="lc-section">
      <div className="lc-container">
        <div className="lc-final">
          <p>
            Sua cozinha organizada começa hoje. Planejamento. Escala. Custo. Compras. Tudo em um app.
            Feito por quem viveu a cozinha de dentro — e nunca parou de aprender.
          </p>
          <a className="lc-btn lc-btn--primary lc-btn--lg" href="/register">
            Quero o Laboratório de Cozinha — R$ 16,50/mês →
          </a>
          <div className="lc-seals" style={{ marginTop: 22 }}>
            <span className="lc-seal">Acesso imediato</span>
            <span className="lc-seal">7 dias grátis</span>
            <span className="lc-seal">Sem renovação automática</span>
            <span className="lc-seal">Sem fidelidade</span>
          </div>
        </div>
      </div>
    </section>
  );
}