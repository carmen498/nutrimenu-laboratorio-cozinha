// Cabeçalho unificado de relatório — reutilizado por todos os relatórios do
// planejamento (Cardápio aberto e Evento). Timbrado padrão do app + título do
// relatório + data de emissão + identificação do cardápio/evento.
export default function CabecalhoRelatorio({ titulo, nome, data, tipoLabel, numPessoas }) {
  const dataEmissao = new Date().toLocaleDateString("pt-BR");
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden mb-3 print:border-0 print:rounded-none">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between flex-wrap gap-x-3 gap-y-1">
        <p className="text-xs">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
        <p className="font-display text-xs text-right">
          {titulo ? `${titulo.toUpperCase()} · ` : ""}emitido em {dataEmissao}
        </p>
      </div>
      <div className="px-4 py-3">
        <h3 className="font-display text-base font-bold">{nome || "—"}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
          {data && <span>{data}</span>}
          {tipoLabel && <span>· {tipoLabel}</span>}
          {numPessoas != null && numPessoas !== "" && <span>· {numPessoas} pessoas</span>}
        </div>
      </div>
    </div>
  );
}