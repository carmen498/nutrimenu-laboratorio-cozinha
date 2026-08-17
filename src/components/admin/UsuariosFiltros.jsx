import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEGMENTOS, ORIGENS, TIPOS_USUARIO } from "@/lib/statusAssinaturaUsuario";
import { SITUACOES_PAGAMENTO, STATUS_PAGAMENTO_LABEL } from "@/lib/pagamentosUsuario";

export default function UsuariosFiltros({
  busca, setBusca, planoFiltro, setPlanoFiltro, statusFiltro, setStatusFiltro,
  segmentoFiltro, setSegmentoFiltro, origemFiltro, setOrigemFiltro,
  tipoUsuarioFiltro, setTipoUsuarioFiltro, situacaoPagamentoFiltro, setSituacaoPagamentoFiltro,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <Input
        placeholder="Buscar por nome, e-mail ou telefone..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select value={planoFiltro} onValueChange={setPlanoFiltro}>
        <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os planos</SelectItem>
          <SelectItem value="trial">Trial</SelectItem>
          <SelectItem value="mensal">Mensal</SelectItem>
          <SelectItem value="anual">Anual</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFiltro} onValueChange={setStatusFiltro}>
        <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="Ativo">Ativo</SelectItem>
          <SelectItem value="Trial expirando">Trial expirando</SelectItem>
          <SelectItem value="Vencido">Vencido</SelectItem>
          <SelectItem value="Inativo">Inativo</SelectItem>
        </SelectContent>
      </Select>
      <Select value={segmentoFiltro} onValueChange={setSegmentoFiltro}>
        <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os segmentos</SelectItem>
          {SEGMENTOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
        <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as origens</SelectItem>
          {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={tipoUsuarioFiltro} onValueChange={setTipoUsuarioFiltro}>
        <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TIPOS_USUARIO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={situacaoPagamentoFiltro} onValueChange={setSituacaoPagamentoFiltro}>
        <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as situações de pagamento</SelectItem>
          {SITUACOES_PAGAMENTO.map((s) => <SelectItem key={s} value={s}>{STATUS_PAGAMENTO_LABEL[s]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}