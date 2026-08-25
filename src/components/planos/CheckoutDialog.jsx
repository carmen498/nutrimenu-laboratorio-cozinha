import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import CartaoForm from "./CartaoForm";
import PixForm from "./PixForm";

export default function CheckoutDialog({ open, onOpenChange, plano, planoNome, email }) {
  const [aprovado, setAprovado] = useState(false);

  const handleClose = () => {
    setAprovado(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Assinar plano {planoNome}</DialogTitle>
        </DialogHeader>

        {aprovado ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="font-medium text-foreground">Pagamento em processamento!</p>
            <p className="text-sm text-muted-foreground">
              Você será notificado assim que a confirmação chegar do Mercado Pago.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="cartao">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cartao">Cartão</TabsTrigger>
              <TabsTrigger value="pix">PIX</TabsTrigger>
            </TabsList>
            <TabsContent value="cartao" className="pt-4">
              <CartaoForm
                plano={plano}
                email={email}
                onClose={handleClose}
                onSuccess={() => setAprovado(true)}
                aceiteTermos={true}
              />
            </TabsContent>
            <TabsContent value="pix" className="pt-4">
              <PixForm
                plano={plano}
                email={email}
                onClose={handleClose}
                onSuccess={() => setAprovado(true)}
                aceiteTermos={true}
              />
            </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}