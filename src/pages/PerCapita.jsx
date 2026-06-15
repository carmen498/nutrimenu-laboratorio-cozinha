import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, FileText } from "lucide-react";

const grupos = [
  {
    grupo: "BASE",
    itens: [
      { n:1,  cat:"Arroz branco cozido", prep:"Arroz branco cozido",          g:120, medida:"4 colheres de sopa cheia" },
      { n:2,  cat:"Arroz branco cozido", prep:"Arroz para refeição servida",   g:150, medida:"4 colheres de mesa" },
      { n:3,  cat:"Feijão cozido",       prep:"Feijão cozido com caldo",       g:120, medida:"1 concha pequena" },
      { n:4,  cat:"Feijão cozido",       prep:"Feijão para refeição servida",  g:150, medida:"1 concha média" },
      { n:5,  cat:"Feijão cozido",       prep:"Feijoada",                      g:400, medida:"3 conchas grandes" },
      { n:6,  cat:"Carne bovina",        prep:"Carne bovina",                  g:150, medida:"1 unidade com molho" },
      { n:7,  cat:"Aves",                prep:"Frango",                        g:150, medida:"1 peça ou filé" },
      { n:8,  cat:"Macarrão",            prep:"Macarrão com molho",            g:250, medida:"2 xícaras de chá" },
      { n:9,  cat:"Pão",                 prep:"Pão francês",                   g:50,  medida:"1 unidade" },
      { n:10, cat:"Sopas e caldos",      prep:"Sopa / Caldo",                  g:350, medida:"2 conchas médias" },
    ]
  },
  {
    grupo: "PRATOS PRINCIPAIS — PREPARAÇÕES BRASILEIRAS",
    itens: [
      { n:11, cat:"Carne bovina",  prep:"Bife / Filé",                       g:150, medida:"1 unidade média" },
      { n:12, cat:"Carne bovina",  prep:"Carne assada / Rosbife",            g:150, medida:"2 a 3 fatias" },
      { n:13, cat:"Carne bovina",  prep:"Carne moída refogada",              g:150, medida:"3 colheres de mesa" },
      { n:14, cat:"Carne bovina",  prep:"Churrasco sem osso",                g:250, medida:"—" },
      { n:15, cat:"Carne bovina",  prep:"Churrasco com osso / misto",        g:500, medida:"—" },
      { n:16, cat:"Carne bovina",  prep:"Almôndega",                         g:120, medida:"2 a 4 unidades" },
      { n:17, cat:"Carne suína",   prep:"Costelinha / Pernil",               g:250, medida:"—" },
      { n:18, cat:"Carne suína",   prep:"Lombinho / Bisteca",                g:150, medida:"1 unidade" },
      { n:19, cat:"Aves",          prep:"Frango assado — coxa+sobrecoxa",    g:200, medida:"1 peça com osso" },
      { n:20, cat:"Aves",          prep:"Frango desfiado",                   g:120, medida:"1 xícara de chá" },
      { n:21, cat:"Aves",          prep:"Frango empanado / filé",            g:120, medida:"1 unidade" },
      { n:22, cat:"Aves",          prep:"Chester / Peru assado",             g:150, medida:"2 a 3 fatias" },
      { n:23, cat:"Peixes",        prep:"Filé de peixe grelhado",            g:150, medida:"1 filé médio" },
      { n:24, cat:"Peixes",        prep:"Bacalhau preparação pronta",        g:200, medida:"4 colheres de mesa" },
      { n:25, cat:"Frutos do mar", prep:"Camarão preparação pronta",         g:200, medida:"4 colheres de mesa" },
      { n:26, cat:"Ovos",          prep:"Omelete",                           g:100, medida:"2 ovos preparados" },
      { n:27, cat:"Ovos",          prep:"Ovo frito / cozido",                g:50,  medida:"1 unidade" },
    ]
  },
  {
    grupo: "MASSAS, TORTAS E PREPARAÇÕES ASSADAS",
    itens: [
      { n:28, cat:"Massas",  prep:"Lasanha",                      g:250, medida:"1 fatia" },
      { n:29, cat:"Massas",  prep:"Espaguete / Macarrão com molho",g:250, medida:"2 xícaras de chá" },
      { n:30, cat:"Massas",  prep:"Nhoque com molho",             g:250, medida:"3 xícaras de chá" },
      { n:31, cat:"Massas",  prep:"Canelone / Rondele com molho", g:250, medida:"2 a 3 unidades" },
      { n:32, cat:"Massas",  prep:"Panqueca recheada",            g:250, medida:"2 unidades" },
      { n:33, cat:"Massas",  prep:"Crepe recheado",               g:250, medida:"2 unidades" },
      { n:34, cat:"Tortas",  prep:"Torta salgada",                g:200, medida:"1 fatia" },
      { n:35, cat:"Tortas",  prep:"Quiche",                       g:200, medida:"1 fatia" },
      { n:36, cat:"Tortas",  prep:"Empadão / Pastelão",           g:200, medida:"1 fatia" },
      { n:37, cat:"Tortas",  prep:"Escondidinho",                 g:250, medida:"4 colheres de mesa" },
      { n:38, cat:"Arroz",   prep:"Risoto",                       g:400, medida:"4 colheres de mesa cheias" },
      { n:39, cat:"Arroz",   prep:"Arroz de forno",               g:200, medida:"2 colheres de mesa" },
      { n:40, cat:"Arroz",   prep:"Arroz com frango / carreteiro", g:400, medida:"4 colheres de mesa" },
    ]
  },
  {
    grupo: "GUARNIÇÕES E ACOMPANHAMENTOS",
    itens: [
      { n:41, cat:"Legumes",     prep:"Legumes cozidos / refogados",  g:120, medida:"3 colheres de sopa" },
      { n:42, cat:"Legumes",     prep:"Purê de batata",               g:120, medida:"3 colheres de sopa" },
      { n:43, cat:"Legumes",     prep:"Batata frita / assada",        g:120, medida:"2 xícaras de chá" },
      { n:44, cat:"Legumes",     prep:"Maionese de batata",           g:150, medida:"3 colheres de mesa" },
      { n:45, cat:"Legumes",     prep:"Mandioca / Aipim cozido",      g:150, medida:"3 colheres de mesa" },
      { n:46, cat:"Saladas",     prep:"Salada crua simples",          g:120, medida:"1 prato" },
      { n:47, cat:"Saladas",     prep:"Salada composta / turbinada",  g:150, medida:"1 prato" },
      { n:48, cat:"Saladas",     prep:"Salada Caesar",                g:150, medida:"1 prato" },
      { n:49, cat:"Farináceos",  prep:"Farofa",                       g:50,  medida:"2 colheres de sopa" },
      { n:50, cat:"Farináceos",  prep:"Pirão / Angu / Polenta",       g:150, medida:"3 colheres de mesa" },
      { n:51, cat:"Farináceos",  prep:"Cuscuz",                       g:100, medida:"3 colheres de mesa" },
    ]
  },
  {
    grupo: "SALGADOS, LANCHES E PETISCOS",
    itens: [
      { n:52, cat:"Salgados assados", prep:"Coxinha — festa",          g:35,  medida:"1 unidade" },
      { n:53, cat:"Salgados assados", prep:"Coxinha — lanche",         g:80,  medida:"1 unidade" },
      { n:54, cat:"Salgados assados", prep:"Kibe assado — festa",      g:35,  medida:"1 unidade" },
      { n:55, cat:"Salgados assados", prep:"Pão de queijo — festa",    g:25,  medida:"1 unidade mini" },
      { n:56, cat:"Salgados assados", prep:"Pão de queijo — padrão",   g:50,  medida:"1 unidade" },
      { n:57, cat:"Salgados fritos",  prep:"Coxinha frita — festa",    g:35,  medida:"1 unidade" },
      { n:58, cat:"Salgados fritos",  prep:"Risole / Bolinho",         g:35,  medida:"1 unidade" },
      { n:59, cat:"Salgados fritos",  prep:"Pastel — festa",           g:35,  medida:"1 unidade mini" },
      { n:60, cat:"Salgados fritos",  prep:"Pastel — feira",           g:150, medida:"1 unidade grande" },
      { n:61, cat:"Lanches",          prep:"Sanduíche / Lanche",       g:150, medida:"1 unidade" },
      { n:62, cat:"Lanches",          prep:"Hambúrguer artesanal",     g:300, medida:"1 unidade" },
      { n:63, cat:"Lanches",          prep:"Hot dog / Cachorro-quente",g:300, medida:"1 unidade" },
      { n:64, cat:"Petiscos",         prep:"Canapé quente",            g:25,  medida:"1 unidade" },
      { n:65, cat:"Petiscos",         prep:"Canapé frio",              g:25,  medida:"1 unidade" },
      { n:66, cat:"Petiscos",         prep:"Amendoim / Petisco seco",  g:30,  medida:"1 porção pequena" },
    ]
  },
  {
    grupo: "SOPAS E CALDOS",
    itens: [
      { n:67, cat:"Sopas", prep:"Sopa de legumes",              g:350, medida:"2 conchas médias" },
      { n:68, cat:"Sopas", prep:"Caldo de feijão / caldo verde",g:150, medida:"1 concha média" },
      { n:69, cat:"Sopas", prep:"Creme de abóbora / cenoura",   g:350, medida:"2 conchas médias" },
      { n:70, cat:"Sopas", prep:"Canja de galinha",             g:350, medida:"2 conchas médias" },
      { n:71, cat:"Sopas", prep:"Sopa de capeletti / macarrão", g:350, medida:"2 conchas médias" },
    ]
  },
  {
    grupo: "SOBREMESAS E DOCES — Medida caseira: referência Anexo V IN 75/2020",
    itens: [
      { n:72, cat:"Bolos",      prep:"Bolo simples / caseiro",     g:80,  medida:"1 fatia · Grupo I · Bolos: 60-80g" },
      { n:73, cat:"Bolos",      prep:"Bolo decorado / comemorativo",g:120, medida:"1 fatia · Grupo I · Bolos: 80-120g" },
      { n:74, cat:"Bolos",      prep:"Bolo de rolo / bolo gelado", g:80,  medida:"1 fatia · Grupo I · Bolos: 60-80g" },
      { n:75, cat:"Bolos",      prep:"Brownie",                    g:60,  medida:"1 unidade · Grupo I · Biscoitos: 30-60g" },
      { n:76, cat:"Docinhos",   prep:"Brigadeiro",                 g:15,  medida:"1 unidade · Grupo II · Doces: 15g" },
      { n:77, cat:"Docinhos",   prep:"Beijinho / Cajuzinho",       g:15,  medida:"1 unidade · Grupo II · Doces: 15g" },
      { n:78, cat:"Docinhos",   prep:"Bombom / Trufa",             g:20,  medida:"1 unidade · Grupo II · Chocolates: 20-25g" },
      { n:79, cat:"Docinhos",   prep:"Olho de sogra / Bicho de pé",g:15,  medida:"1 unidade · Grupo II · Doces: 15g" },
      { n:80, cat:"Sobremesas", prep:"Pudim de leite",             g:120, medida:"1 fatia · Grupo IV · Sobremesas lácteas: 100-130g" },
      { n:81, cat:"Sobremesas", prep:"Mousse",                     g:120, medida:"1 taça individual · Grupo IV: 100-120g" },
      { n:82, cat:"Sobremesas", prep:"Cheesecake",                 g:100, medida:"1 fatia · Grupo I+IV: 100g" },
      { n:83, cat:"Sobremesas", prep:"Pavê / Torta gelada",        g:120, medida:"1 fatia · Grupo II · Sobremesas: 100-120g" },
      { n:84, cat:"Sobremesas", prep:"Sorvete",                    g:80,  medida:"1 bola · Grupo IV · Sorvetes: 60-80g" },
      { n:85, cat:"Sobremesas", prep:"Açaí",                       g:200, medida:"1 tigela individual · sem previsão no Anexo V" },
      { n:86, cat:"Sobremesas", prep:"Salada de frutas",           g:120, medida:"1 taça · Grupo III · Frutas: 120g" },
      { n:87, cat:"Sobremesas", prep:"Petit gâteau",               g:80,  medida:"1 unidade · sem previsão no Anexo V" },
      { n:88, cat:"Sobremesas", prep:"Romeu e Julieta",            g:80,  medida:"1 fatia queijo + goiabada · Grupo IV+II" },
      { n:89, cat:"Sobremesas", prep:"Doce de leite",              g:30,  medida:"1 colher de sopa · Grupo II · Doces: 30g" },
    ]
  },
  {
    grupo: "CAFÉ DA MANHÃ E LANCHES — Medida caseira: referência Anexo V IN 75/2020",
    itens: [
      { n:90,  cat:"Pães",    prep:"Pão francês / de sal",          g:50,  medida:"1 unidade · Grupo I · Pães: 50g" },
      { n:91,  cat:"Pães",    prep:"Pão de forma",                  g:25,  medida:"1 fatia · Grupo I · Pães: 25g" },
      { n:92,  cat:"Pães",    prep:"Croissant",                     g:60,  medida:"1 unidade · Grupo I · Pães especiais: 57-60g" },
      { n:93,  cat:"Pães",    prep:"Tapioca",                       g:80,  medida:"1 unidade · sem previsão no Anexo V" },
      { n:94,  cat:"Cereais", prep:"Granola / Aveia com iogurte",   g:150, medida:"1 tigela · Grupo I · Cereais: 30-40g seco" },
      { n:95,  cat:"Frutas",  prep:"Fruta inteira — banana, maçã",  g:100, medida:"1 unidade média · Grupo III: 100-120g" },
      { n:96,  cat:"Bebidas", prep:"Café",                          g:50,  medida:"1 xícara (50ml) · Grupo VI" },
      { n:97,  cat:"Bebidas", prep:"Leite",                         g:200, medida:"1 copo (200ml) · Grupo IV" },
      { n:98,  cat:"Bebidas", prep:"Suco natural",                  g:200, medida:"1 copo (200ml) · Grupo VI" },
      { n:99,  cat:"Bebidas", prep:"Refrigerante",                  g:250, medida:"1 copo ou lata (200ml) · Grupo VI" },
      { n:100, cat:"Bebidas", prep:"Água",                          g:300, medida:"1 copo (200ml) · referência geral" },
    ]
  },
  {
    grupo: "INGREDIENTES CRUS — REFERÊNCIA PARA PLANEJAMENTO DA PRODUÇÃO",
    itens: [
      { n:101, cat:"Cereais",      prep:"Arroz branco cru",                    g:80,  medida:"2/3 de xícara de chá" },
      { n:102, cat:"Cereais",      prep:"Arroz para risoto cru",               g:80,  medida:"2/3 de xícara de chá" },
      { n:103, cat:"Leguminosas",  prep:"Feijão seco cru",                     g:60,  medida:"1/4 de xícara" },
      { n:104, cat:"Cereais",      prep:"Macarrão seco cru",                   g:100, medida:"1/5 do pacote (500g)" },
      { n:105, cat:"Carnes",       prep:"Carne bovina sem osso crua",          g:150, medida:"1 bife" },
      { n:106, cat:"Carnes",       prep:"Carne churrasco misto com osso crua", g:500, medida:"1 porção pesada" },
      { n:107, cat:"Aves",         prep:"Frango inteiro com osso cru",         g:200, medida:"1 unidade" },
      { n:108, cat:"Peixes",       prep:"Peixe filé cru",                      g:120, medida:"1 filé médio" },
      { n:109, cat:"Legumes",      prep:"Batata para purê / maionese crua",    g:150, medida:"3 colheres de mesa" },
      { n:110, cat:"Farináceos",   prep:"Polenta / fubá cru",                  g:50,  medida:"1/4 de xícara" },
    ]
  },
];

const todosItens = grupos.flatMap(g => g.itens.map(i => ({ ...i, grupo: g.grupo })));

export default function PerCapita() {
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const printRef = useRef();

  const nomesGrupos = useMemo(() => [...new Set(grupos.map(g => g.grupo))], []);

  const itensFiltrados = useMemo(() => {
    let results = todosItens;
    if (filtroGrupo) {
      results = results.filter(i => i.grupo === filtroGrupo);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      results = results.filter(i =>
        i.prep.toLowerCase().includes(s) ||
        i.cat.toLowerCase().includes(s) ||
        i.medida.toLowerCase().includes(s) ||
        i.grupo.toLowerCase().includes(s)
      );
    }
    return results;
  }, [search, filtroGrupo]);

  return (
    <div className="space-y-4 pb-24 md:pb-8" ref={printRef}>
      {/* Header */}
      <div className="text-center space-y-1 no-print">
        <h1 className="font-display text-lg md:text-xl font-bold leading-tight">
          TABELA DE REFERÊNCIA · PER CAPITA DE PREPARAÇÕES PRONTAS — CONSUMO BRASILEIRO
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground max-w-3xl mx-auto">
          Quantidade média por pessoa · preparação pronta para servir (g/pessoa) · Base: POF IBGE 2017-2018 + Calculadora Nutrimenu + Referências de UAN
        </p>
        <p className="text-[10px] text-muted-foreground italic">
          Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026 — Estudo preliminar · valores a validar conforme tipo de evento e perfil dos comensais
        </p>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="font-display text-lg font-bold">TABELA DE REFERÊNCIA · PER CAPITA DE PREPARAÇÕES PRONTAS</h1>
        <p className="text-xs text-muted-foreground">Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria ou medida..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Todos os grupos ({todosItens.length} itens)</option>
          {nomesGrupos.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <Button variant="outline" onClick={() => window.print()}>
          <FileText className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground no-print">
        {itensFiltrados.length} {itensFiltrados.length === 1 ? "item" : "itens"} encontrado{itensFiltrados.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b-2 border-border">
              <th className="text-left px-2 py-2 font-semibold text-xs w-10">Nº</th>
              <th className="text-left px-2 py-2 font-semibold text-xs">Categoria</th>
              <th className="text-left px-2 py-2 font-semibold text-xs">Preparação / Alimento</th>
              <th className="text-right px-2 py-2 font-semibold text-xs w-28">Per capita médio (g)</th>
              <th className="text-left px-2 py-2 font-semibold text-xs hidden md:table-cell">Medida caseira de referência</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item, idx) => (
              <tr key={item.n} className={`border-b border-border/50 hover:bg-muted/30 ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"} ${idx === 0 || itensFiltrados[idx-1]?.grupo !== item.grupo ? "border-t-2 border-t-primary/20" : ""}`}>
                <td className="px-2 py-1.5 text-muted-foreground text-xs">{item.n}</td>
                <td className="px-2 py-1.5 text-xs text-muted-foreground">{item.cat}</td>
                <td className="px-2 py-1.5 font-medium text-xs">
                  {(idx === 0 || itensFiltrados[idx-1]?.grupo !== item.grupo) && (
                    <span className="block text-[10px] text-primary font-semibold uppercase tracking-wide mb-0.5">{item.grupo}</span>
                  )}
                  {item.prep}
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-primary text-xs tabular-nums">{item.g}</td>
                <td className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">{item.medida}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Referências */}
      <Accordion type="single" collapsible className="no-print">
        <AccordionItem value="refs">
          <AccordionTrigger className="text-sm font-medium">Referências bibliográficas</AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
              <li>POF IBGE 2017-2018 · ibge.gov.br/pof2017-2018</li>
              <li>Calculadora de Custos de Produção Nutrimenu · Carmen S. Reinstein · 2025</li>
              <li>Instrução Normativa IN 75/2020 ANVISA · Anexo V</li>
              <li>Abreu ES et al. · Gestão de UAN · Metha · 2016</li>
              <li>CFN Resolução 600/2018</li>
              <li>Carmen S. Reinstein · experiência profissional · 20+ anos</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Rodapé */}
      <footer className="text-center space-y-3 pt-4">
        <p className="text-xs text-muted-foreground italic max-w-2xl mx-auto leading-relaxed">
          "Não existe norma técnica brasileira específica de per capita para preparações prontas para servir. O Anexo V da IN 75/2020 (ANVISA) trata de porções para rotulagem nutricional — não de serviço. Esta tabela é estudo pioneiro. Carmen S. Reinstein / Nutrimenu / Receita na Medida · 2026."
        </p>
      </footer>
    </div>
  );
}