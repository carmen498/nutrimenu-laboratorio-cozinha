import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function somarDias(data, quantidade) {
  const valor = new Date(`${data}T00:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + quantidade);
  return valor.toISOString().slice(0, 10);
}

export default function GestaoCardapioDialogs({
  modo,
  cardapio,
  pending = false,
  onClose,
  onEditar,
  onDuplicar,
  onExcluir,
}) {
  const [nomeEdicao, setNomeEdicao] = useState(cardapio.nome || "");
  const [observacoes, setObservacoes] = useState(cardapio.observacoes || "");
  const [nomeRefeicao, setNomeRefeicao] = useState(cardapio.nome_refeicao || "");
  const [dataEdicao, setDataEdicao] = useState(cardapio.data_inicio || "");
  const [semData, setSemData] = useState(cardapio.exibir_datas === false);
  const [nomeCopia, setNomeCopia] = useState(`${cardapio.nome} — cópia`);
  const [dataCopia, setDataCopia] = useState(somarDias(cardapio.data_inicio, 7));

  if (modo === "editar") {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && !pending && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cardápio</DialogTitle>
            <DialogDescription>Altere a identificação e as observações gerais desta semana.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              onEditar({
                nome: nomeEdicao,
                observacoes,
                nome_refeicao: nomeRefeicao,
                data_inicio: semData ? undefined : dataEdicao,
                exibir_datas: !semData,
              });
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Nome do Cardápio</span>
              <input
                required
                value={nomeEdicao}
                onChange={(evento) => setNomeEdicao(evento.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Qual é a refeição? <span className="font-normal text-muted-foreground">(opcional)</span></span>
              <input
                list="tipos-refeicao-cardapio"
                value={nomeRefeicao}
                onChange={(evento) => setNomeRefeicao(evento.target.value)}
                placeholder="Ex.: Almoço, Jantar, Café da manhã..."
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <datalist id="tipos-refeicao-cardapio">
                <option value="Café da manhã" />
                <option value="Almoço" />
                <option value="Jantar" />
                <option value="Lanche" />
                <option value="Ceia" />
                <option value="Brunch" />
              </datalist>
              <p className="text-xs text-muted-foreground">Escolha uma sugestão ou digite livremente outro nome.</p>
            </label>
            <div className="space-y-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Segunda-feira inicial</span>
                <input
                  type="date"
                  value={semData ? "" : dataEdicao}
                  disabled={semData}
                  onChange={(evento) => setDataEdicao(evento.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:text-muted-foreground"
                />
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={semData}
                  onChange={(evento) => setSemData(evento.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span>Cardápio sem data</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Ao alterar a data, os sete dias e todos os itens serão deslocados juntos. Marque “Cardápio sem data” para ocultar o período.
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Observações</span>
              <textarea
                value={observacoes}
                onChange={(evento) => setObservacoes(evento.target.value)}
                rows={4}
                placeholder="Informações gerais sobre o planejamento da semana..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </label>
            <DialogFooter>
              <button type="button" onClick={onClose} disabled={pending} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-50">
                Cancelar
              </button>
              <button disabled={pending || !nomeEdicao.trim() || (!semData && !dataEdicao)} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {pending && <Loader2 className="w-4 h-4 animate-spin" />} Salvar alterações
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (modo === "duplicar") {
    return (
      <Dialog open onOpenChange={(aberto) => !aberto && !pending && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Cardápio semanal</DialogTitle>
            <DialogDescription>
              Será criada uma nova semana independente, com os mesmos itens, classificações e ordem.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(evento) => {
              evento.preventDefault();
              onDuplicar({ nome: nomeCopia, data_inicio: dataCopia });
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Nome da cópia</span>
              <input
                required
                value={nomeCopia}
                onChange={(evento) => setNomeCopia(evento.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Segunda-feira inicial <span className="font-normal text-muted-foreground">(opcional)</span></span>
              <input
                type="date"
                value={dataCopia}
                onChange={(evento) => setDataCopia(evento.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Apague a data para manter o mesmo período do Cardápio original. Se informar outra data, ela deve ser uma segunda-feira.</p>
            </label>
            <DialogFooter>
              <button type="button" onClick={onClose} disabled={pending} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-50">
                Cancelar
              </button>
              <button disabled={pending || !nomeCopia.trim()} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {pending && <Loader2 className="w-4 h-4 animate-spin" />} Duplicar semana
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (modo === "excluir") {
    return (
      <AlertDialog open onOpenChange={(aberto) => !aberto && !pending && onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este Cardápio?</AlertDialogTitle>
            <AlertDialogDescription>
              “{cardapio.nome}” e todos os itens distribuídos na semana serão excluídos. Essa ação não altera as Refeições, Receitas ou Ingredientes de origem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(evento) => {
                evento.preventDefault();
                onExcluir();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Excluir Cardápio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
