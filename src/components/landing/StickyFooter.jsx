import React from "react";

export default function StickyFooter() {
  return (
    <div className="lc-sticky-footer">
      <div className="lc-sticky-inner">
        <p className="lc-sticky-text">
          <strong>Laboratório de Cozinha</strong> · A partir de R$ 29,90/30 dias ·
          Sem renovação automática — você decide quando continuar
        </p>
        <a className="lc-btn lc-btn--primary lc-sticky-cta" href="/register">
          Começar agora →
        </a>
      </div>
    </div>
  );
}