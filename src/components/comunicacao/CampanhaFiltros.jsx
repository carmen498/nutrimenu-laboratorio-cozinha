import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CampanhaFiltros({ busca, setBusca, planoFiltro, setPlanoFiltro, statusFiltro, setStatusFiltro }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
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
        </SelectContent>
      </Select>
    </div>
  );
}