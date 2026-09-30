import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const ConfirmContext = createContext(null);

/**
 * Diálogo de confirmação imperativo, no padrão visual dos demais AlertDialog.
 *
 *   const confirm = useConfirm();
 *   await confirm({
 *     title: "Excluir receita",
 *     highlight: receita.nome,
 *     description: "A receita vai para a lixeira e pode ser restaurada em Restaurar entidades.",
 *     confirmLabel: "Excluir",
 *     onConfirm: async () => { await deleteMut.mutateAsync(id); },
 *   });
 *
 * - Cancelar é a ação padrão (foco inicial); Esc equivale a cancelar.
 * - Enquanto onConfirm roda, o botão fica desabilitado e mostra "Excluindo...".
 */
export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState({ open: false });
  const resolverRef = useRef(null);
  const optionsRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    if (state.open && !state.pending) {
      // foco inicial no botão de cancelar — ação destrutiva nunca é o default
      cancelRef.current?.focus();
    }
  }, [state.open, state.pending]);

  const close = useCallback((value) => {
    setState({ open: false });
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
    optionsRef.current = null;
  }, []);

  const confirm = useCallback((options) => {
    optionsRef.current = options || {};
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, options: options || {}, pending: false });
    });
  }, []);

  const handleConfirm = async () => {
    setState((s) => ({ ...s, pending: true }));
    try {
      const fn = optionsRef.current?.onConfirm;
      if (typeof fn === "function") await fn();
      close(true);
    } catch {
      // mantém o diálogo aberto para o usuário tentar de novo ou cancelar
      setState((s) => ({ ...s, pending: false }));
    }
  };

  const opts = state.options || {};

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(v) => {
          if (!v && !state.pending) close(false);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title || "Confirmar"}</AlertDialogTitle>
            {opts.highlight && (
              <p className="font-semibold text-foreground break-words -mt-1">{opts.highlight}</p>
            )}
          </AlertDialogHeader>
          {opts.description && (
            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel ref={cancelRef} disabled={state.pending}>
              {opts.cancelLabel || "Cancelar"}
            </AlertDialogCancel>
            <Button
              variant={opts.destructive === false ? "default" : "destructive"}
              disabled={state.pending}
              onClick={handleConfirm}
            >
              {state.pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {opts.processingLabel || "Excluindo..."}
                </>
              ) : (
                opts.confirmLabel || "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm deve ser usado dentro de ConfirmDialogProvider");
  return ctx.confirm;
}