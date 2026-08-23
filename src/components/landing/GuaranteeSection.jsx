import React from "react";
import { ShieldCheck } from "lucide-react";

export default function GuaranteeSection() {
  return (
    <section className="lc-section">
      <div className="lc-container lc-container--narrow">
        <div className="lc-guarantee">
          <h2>
            <ShieldCheck size={26} strokeWidth={2} aria-hidden="true" />
            Sem risco para testar
          </h2>
          <p>
            Você tem 7 dias de teste completamente grátis para conhecer o Laboratório de Cozinha, sem nenhuma cobrança.
            Se decidir assinar um plano pago, a lei garante seu direito de arrependimento em até 7 dias da contratação,
            com devolução integral do valor — é só pedir pelo nosso WhatsApp de suporte que a gente cuida do estorno.
            O teste grátis não consome esse prazo. E como não há renovação automática, você nunca é cobrado sem saber:
            cada plano vale pelo período contratado, e só continua se você quiser.
          </p>
        </div>
      </div>
    </section>
  );
}
