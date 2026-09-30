import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEGMENTOS, ORIGENS, TIPOS_USUARIO, ORIGEM_CADASTRO_LABEL } from "@/lib/statusAssinaturaUsuario";
import { SITUACOES_PAGAMENTO, STATUS_PAGAMENTO_LABEL } from "@/lib/pagamentosUsuario";
import { PERIODOS } from "@/lib/periodoFiltro";

export default function UsuariosFiltros({
  busca, setBusca, planoFiltro, setPlanoFiltro, statusFiltro, setStatusFiltro,
  segmentoFiltro, setSegmentoFiltro, origemFiltro, setOrigemFiltro,
  tipoUsuarioFiltro, setTipoUsuarioFiltro, situacaoPagamentoFiltro, setSituacaoPagamentoFiltro,
  origemCadastroFiltro, setOrigemCadastroFiltro,
  periodoFiltro, setPeriodoFiltro, dataInicioCustom, setDataInicioCustom, dataFimCustom, setDataFimCustom,
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={origemCadastroFiltro} onValueChange={setOrigemCadastroFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os produtos</SelectItem>
            {Object.entries(ORIGEM_CADASTRO_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={planoFiltro} onValueChange={setPlanoFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os planos</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Trial expirando">Trial expirando</SelectItem>
            <SelectItem value="Vencido">Vencido</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={situacaoPagamentoFiltro} onValueChange={setSituacaoPagamentoFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações de pagamento</SelectItem>
            {SITUACOES_PAGAMENTO.map((s) => <SelectItem key={s} value={s}>{STATUS_PAGAMENTO_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={segmentoFiltro} onValueChange={setSegmentoFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os segmentos</SelectItem>
            {SEGMENTOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as origens</SelectItem>
            {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tipoUsuarioFiltro} onValueChange={setTipoUsuarioFiltro}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS_USUARIO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {periodoFiltro === "personalizado" && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data inicial</label>
            <Input
              type="date"
              value={dataInicioCustom}
              onChange={(e) => setDataInicioCustom(e.target.value)}
              className="sm:w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Data final</label>
            <Input
              type="date"
              value={dataFimCustom}
              onChange={(e) => setDataFimCustom(e.target.value)}
              className="sm:w-40"
            />
          </div>
        </div>
      )}
    </div>
  );
}