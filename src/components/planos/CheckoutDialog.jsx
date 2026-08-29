import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import CartaoForm from "./CartaoForm";
import PixForm from "./PixForm";

export default function CheckoutDialog({ open, onOpenChange, plano, planoNome, email, planoValor = 0, addon = null, addonCheckoutBloqueado = false, somenteAddon = false }) {
  const [aprovado, setAprovado] = useState(false);
  const [aceiteContratacao, setAceiteContratacao] = useState(false);

  const handleClose = () => {
    setAprovado(false);
    setAceiteContratacao(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{somenteAddon ? "Adicionar Laboratório de Custos" : `Assinar plano ${planoNome}`}</DialogTitle>
        </DialogHeader>

        {(addon || planoValor > 0) && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
            {!somenteAddon && (
              <div className="flex items-center justify-between gap-3">
                <span>Laboratório de Cozinha · {planoNome}</span>
                <span className="font-medium">R$ {Number(planoValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {addon && (
              <div className="flex items-center justify-between gap-3">
                <span>Laboratório de Custos · {addon.nome}</span>
                <span className="font-medium">R$ {Number(addon.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="pt-2 border-t flex items-center justify-between gap-3 font-semibold">
              <span>Total</span>
              <span>R$ {Number((somenteAddon ? 0 : planoValor || 0) + (addon?.valor || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {addon && addonCheckoutBloqueado ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">Contratação conjunta em homologação</p>
            <p className="mt-1 text-xs">O Laboratório de Custos já está integrado à decisão de compra nesta tela, mas a cobrança combinada ainda está bloqueada no servidor. Nenhum valor será cobrado enquanto esta etapa não for liberada.</p>
          </div>
        ) : aprovado ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="font-medium text-foreground">Pagamento em processamento!</p>
            <p className="text-sm text-muted-foreground">
              Você será notificado assim que a confirmação chegar do Mercado Pago.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={aceiteContratacao}
                onChange={(e) => setAceiteContratacao(e.target.checked)}
              />
              <span className="leading-snug text-muted-foreground">
                Li e aceito os <a href="/termos" target="_blank" rel="noreferrer" className="underline text-foreground">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer" className="underline text-foreground">Política de Privacidade</a> desta contratação.
              </span>
            </label>
            <Tabs defaultValue="cartao">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cartao">Cartão</TabsTrigger>
              <TabsTrigger value="pix">PIX</TabsTrigger>
            </TabsList>
            <TabsContent value="cartao" className="pt-4">
              <CartaoForm
                plano={somenteAddon ? addon?.id : plano}
                addonPlanoId={addon?.id || null}
                somenteAddon={somenteAddon}
                email={email}
                onClose={handleClose}
                onSuccess={() => setAprovado(true)}
                aceiteTermos={aceiteContratacao}
              />
            </TabsContent>
            <TabsContent value="pix" className="pt-4">
              <PixForm
                plano={somenteAddon ? addon?.id : plano}
                addonPlanoId={addon?.id || null}
                somenteAddon={somenteAddon}
                email={email}
                onClose={handleClose}
                onSuccess={() => setAprovado(true)}
                aceiteTermos={aceiteContratacao}
              />
            </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}