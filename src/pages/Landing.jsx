import React, { useEffect } from "react";
import "@/landing.css";
import "@/landing-refined.css";
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

const IMG = {
  hero: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/5ab5bfbdd_generated_image.png",
  pain: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/b43340f32_generated_image.png",
  baking: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/9196f8bd5_generated_image.png",
  couple: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/ddf030eaf_generated_image.png",
  carmen: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/db3984d1d_generated_image.png",
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
    <main className="lc-page">
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
      <StickyFooter />
    </main>
  );
}
