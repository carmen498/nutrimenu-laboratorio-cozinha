import React, { useEffect } from "react";
import "@/landing.css";
import "@/landing-refined.css";
import { APP_SITE_URLS } from "@/lib/publicUrls";
import StickyFooter from "@/components/landing/StickyFooter";
import HeroSection from "@/components/landing/HeroSection";
import NumbersSection from "@/components/landing/NumbersSection";
import PainSection from "@/components/landing/PainSection";
import AudienceSection from "@/components/landing/AudienceSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StorySection from "@/components/landing/StorySection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import PlansSection from "@/components/landing/PlansSection";
import GuaranteeSection from "@/components/landing/GuaranteeSection";
import FaqSection from "@/components/landing/FaqSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import heroImg from "@/assets/landing/hero.jpg";
import painImg from "@/assets/landing/pain.jpg";
import bakingImg from "@/assets/landing/baking.jpg";
import coupleImg from "@/assets/landing/couple.jpg";
import carmenImg from "@/assets/landing/carmen.jpg";

const IMG = {
  hero: heroImg,
  pain: painImg,
  baking: bakingImg,
  couple: coupleImg,
  carmen: carmenImg,
};

export default function Landing() {
  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.querySelector('meta[name="description"]');
    const previousDescription = existingDescription?.getAttribute("content") ?? null;
    let description = existingDescription;
    let createdDescription = false;

    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.appendChild(description);
      createdDescription = true;
    }

    document.title = "Laboratório de Cozinha | Planeje, calcule e produza com método";
    description.setAttribute(
      "content",
      "Organize receitas, cardápios, custos, per capita e listas de compras em um só lugar. Experimente o Laboratório de Cozinha por 7 dias grátis."
    );

    return () => {
      document.title = previousTitle;
      if (createdDescription) {
        description.remove();
      } else if (previousDescription !== null) {
        description.setAttribute("content", previousDescription);
      }
    };
  }, []);

  return (
    <div className="lc-page">
      <main>
        <HeroSection heroImage={IMG.hero} />
        <NumbersSection />
        <PainSection image={IMG.pain} />
        <AudienceSection imageBaking={IMG.baking} imageCouple={IMG.couple} />
        <FeaturesSection />
        <StorySection image={IMG.carmen} />
        <BenefitsSection />
        <PlansSection />
        <GuaranteeSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <footer className="lc-footer">
        <div className="lc-footer-inner">
          <nav aria-label="Links legais e acesso">
            <a href="/sobre">Sobre</a>
            <a href="/produto">Produto</a>
            <a href="/contato">Contato</a>
            <a href="/termos">Termos de Uso</a>
            <a href="/privacidade">Política de Privacidade</a>
            <a href="https://wa.me/555134160886" target="_blank" rel="noopener noreferrer">Suporte</a>
            <a href={APP_SITE_URLS.login}>Entrar</a>
          </nav>
          <p className="lc-footer-copy">
            Laboratório de Cozinha é parte da Plataforma ZR · Todos os direitos reservados
          </p>
        </div>
      </footer>
      <StickyFooter />
    </div>
  );
}