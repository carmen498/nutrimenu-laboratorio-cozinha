import React from "react";
import UseCaseBlock from "@/components/landing/UseCaseBlock";
import { LANDING_IMAGES, USE_CASES } from "@/lib/landingUseCases";

export default function UseCasesSection() {
  return (
    <section className="lc-use-cases" aria-label="Formas de usar o Laboratório de Cozinha">
      <div className="lc-container">
        {USE_CASES.map((item) => <UseCaseBlock key={item.key} item={item} image={LANDING_IMAGES[item.key]} />)}
      </div>
    </section>
  );
}