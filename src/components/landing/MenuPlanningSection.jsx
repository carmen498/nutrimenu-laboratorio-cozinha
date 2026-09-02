import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { APP_SITE_URLS } from "@/lib/publicUrls";
import {
  CARDAPIO_IMPRESSAO_IMAGE,
  CARDAPIO_PLANEJAMENTO_IMAGE,
} from "@/assets/landingCardapioScreens";

export default function MenuPlanningSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="lc-menu-planning" aria-labelledby="menu-planning-title">
      <div className="lc-container">
        <div className="lc-menu-planning-head">
          <div>
            <p className="lc-eyebrow">Novo no Laboratório</p>
            <h2 id="menu-planning-title">Planeje a semana inteira em uma única tela</h2>
          </div>
          <p>
            Organize receitas, refeições e ingredientes por dia. Reordene os itens,
            mova preparações entre os dias, duplique o planejamento e gere uma versão
            limpa para consultar ou imprimir.
          </p>
        </div>

        <div className="lc-menu-planning-gallery">
          <figure className="lc-menu-planning-primary">
            <img
              src={CARDAPIO_PLANEJAMENTO_IMAGE}
              alt="Planejamento semanal de cardápios organizado por dia no Laboratório de Cozinha"
              width="1100"
              height="705"
              loading="lazy"
            />
            <figcaption>Planeje na tela e reorganize cada dia.</figcaption>
          </figure>
          <figure className="lc-menu-planning-secondary">
            <img
              src={CARDAPIO_IMPRESSAO_IMAGE}
              alt="Versão do cardápio semanal preparada para visualização e impressão"
              width="850"
              height="544"
              loading="lazy"
            />
            <figcaption>Visualize, consulte ou imprima o cardápio completo.</figcaption>
          </figure>
        </div>

        <div className="lc-menu-planning-footer">
          <ul aria-label="Recursos do planejamento semanal">
            <li>Planejamento distribuído por dia</li>
            <li>Receitas, refeições e ingredientes juntos</li>
            <li>Reorganização e transferência entre dias</li>
            <li>Duplicação para reaproveitar estruturas</li>
            <li>Versão organizada para impressão</li>
          </ul>
          <a
            className="lc-btn lc-btn--primary lc-btn--lg"
            href={isAuthenticated ? APP_SITE_URLS.appHome : APP_SITE_URLS.register}
          >
            {isAuthenticated ? "Planejar meu cardápio" : "Planejar meu cardápio semanal"}
          </a>
        </div>
      </div>
    </section>
  );
}
