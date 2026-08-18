import React from "react";

const SECOES = [
  {
    titulo: "1. Sobre a Plataforma",
    paragrafos: [
      "1.1. O Laboratório de Cozinha é uma plataforma digital que disponibiliza ferramentas de apoio à organização e gestão de atividades relacionadas ao setor de alimentação, incluindo, conforme as funcionalidades disponíveis:",
    ],
    lista: [
      "planejamento de cardápios;",
      "cálculo de quantidades e per capita;",
      "escalonamento de receitas;",
      "organização e gestão de freezer e estoque;",
      "formação e simulação de preços;",
      "organização de receitas e ingredientes; e",
      "gestão e planejamento de produção.",
    ],
    posLista: [
      "1.2. As funcionalidades efetivamente disponíveis poderão variar conforme o plano contratado e a evolução da Plataforma.",
      "1.3. A Plataforma é uma ferramenta de apoio. As decisões profissionais, comerciais, técnicas, sanitárias, nutricionais, fiscais e regulatórias relacionadas à operação do Usuário permanecem sob sua responsabilidade e, quando aplicável, dos profissionais legalmente habilitados por ele contratados.",
    ],
  },
  {
    titulo: "2. Cadastro e conta",
    paragrafos: [
      "2.1. Para utilizar determinadas funcionalidades, o Usuário deverá criar uma conta e fornecer informações verdadeiras, completas e atualizadas.",
      "2.2. Poderão ser solicitados, entre outros, nome, e-mail, telefone ou WhatsApp e nome do negócio ou empresa, quando aplicável.",
      "2.3. O Usuário é responsável pela segurança de suas credenciais e não deverá compartilhar senha ou acesso com pessoa não autorizada.",
      "2.4. Nos planos que permitam múltiplos usuários, os acessos deverão observar a quantidade e as condições previstas na contratação.",
      "2.5. O Usuário deverá comunicar imediatamente à Empresa qualquer suspeita de uso indevido, comprometimento de senha ou acesso não autorizado à sua conta.",
      "2.6. A utilização da Plataforma é destinada a pessoas maiores de 18 (dezoito) anos ou a pessoas jurídicas regularmente representadas. Ao criar a conta, o Usuário declara possuir capacidade civil plena ou representar validamente a pessoa jurídica contratante.",
    ],
  },
  {
    titulo: "3. Aceitação destes Termos",
    paragrafos: [
      "3.1. Estes Termos deverão estar disponíveis ao Usuário antes da contratação e poderão ser consultados posteriormente na Plataforma.",
      "3.2. Ao concluir a contratação ou criar a conta quando solicitado a aceitar estes Termos, o Usuário declara que teve oportunidade de conhecê-los previamente.",
      "3.3. Nas relações de consumo, permanecem integralmente preservados os direitos assegurados pela legislação aplicável.",
    ],
  },
  {
    titulo: "4. Planos e períodos de acesso",
    paragrafos: [
      "4.1. A Plataforma adota modelo de acesso por prazo determinado, mediante contratação ativa pelo Usuário.",
      "4.2. Os planos vigentes são:",
    ],
    lista: [
      "Teste Grátis: 7 (sete) dias de acesso, sem cobrança, com acesso completo aos recursos disponíveis no plano;",
      "Plano Mensal: R$ 29,90 por mês;",
      "Plano Anual: equivalente a R$ 16,50/mês, cobrado em parcela única de R$ 198,00/ano;",
      "Renovação (a partir do 2º ano de uso contínuo): R$ 16,50/mês em até 6 (seis) parcelas, ou R$ 99,00 à vista/ano, como benefício de fidelidade.",
    ],
    posLista: [
      "Os preços, funcionalidades, prazo de acesso, formas de pagamento e eventuais condições promocionais serão apresentados ao Usuário antes da conclusão da contratação.",
      "4.3. Salvo informação expressa em sentido diverso apresentada no momento da contratação, não haverá renovação automática nem nova cobrança ao término do período contratado, e a continuidade do acesso dependerá de nova contratação realizada ativamente pelo Usuário.",
      "4.4. Alterações de preços ou condições comerciais valerão apenas para contratações futuras e não alterarão retroativamente o período de acesso já adquirido.",
      "4.5. A Empresa poderá oferecer períodos gratuitos de teste. As condições, duração e funcionalidades disponíveis no teste serão apresentadas antes de sua ativação.",
      "4.6. O término do período gratuito não implicará cobrança automática, salvo se o Usuário realizar posteriormente uma contratação paga de forma ativa.",
    ],
  },
  {
    titulo: "5. Pagamento",
    paragrafos: [
      "5.1. O pagamento poderá ser processado por prestador de serviços de pagamento terceirizado, atualmente o Mercado Pago, ou por outro fornecedor informado ao Usuário.",
      "5.2. A Empresa não armazena diretamente os dados completos do cartão de crédito, sem prejuízo do recebimento dos dados transacionais e de cobrança necessários para confirmação, conciliação, suporte e gestão da contratação.",
      "5.3. O acesso pago será liberado após a confirmação do pagamento.",
      "5.4. Caso o pagamento não seja confirmado, a Empresa poderá deixar de liberar ou renovar o acesso até a regularização.",
      "5.5. Parcelamento realizado pelo intermediador de pagamento não altera o prazo de acesso contratado nem caracteriza renovação automática.",
    ],
  },
  {
    titulo: "6. Direito de arrependimento e reembolso",
    paragrafos: [
      "6.1. Quando a contratação estiver sujeita às normas de proteção ao consumidor, o Usuário poderá exercer o direito de arrependimento no prazo legal de 7 (sete) dias, contado da contratação realizada fora do estabelecimento comercial, inclusive por meio eletrônico.",
      "6.2. O direito poderá ser exercido pela mesma ferramenta utilizada para realizar a contratação e pelo canal de atendimento indicado no item 17 destes Termos.",
      "6.3. Recebida a solicitação, a Empresa providenciará os procedimentos de cancelamento e restituição aplicáveis, inclusive comunicação ao intermediador de pagamento quando necessária.",
      "6.4. Fora das hipóteses de direito de arrependimento e das demais situações em que a legislação assegure restituição, a interrupção voluntária do uso pelo Usuário antes do término do período adquirido não gera direito automático ao reembolso proporcional do período não utilizado.",
      "6.5. O período de Teste Grátis não se confunde com o direito de arrependimento nem o substitui: este último aplica-se exclusivamente a contratações pagas, sendo assegurado por 7 (sete) dias a contar de cada contratação onerosa, independentemente de o Usuário já ter utilizado o Teste Grátis anteriormente.",
    ],
  },
  {
    titulo: "7. Encerramento do período de acesso",
    paragrafos: [
      "7.1. Encerrado o prazo contratado, o acesso às funcionalidades pagas será encerrado automaticamente, salvo realização de nova contratação pelo Usuário.",
      "7.2. O Laboratório de Cozinha não deverá ser utilizado como único meio de armazenamento permanente das informações essenciais ao negócio do Usuário.",
      "7.3. O Usuário deverá manter cópia própria das informações que considere relevantes, inclusive receitas, fichas, custos, cardápios e demais registros.",
      "7.4. Após o término do período de acesso, os conteúdos cadastrados pelo Usuário permanecerão armazenados por prazo indeterminado, para possibilitar eventual reativação da conta, até que o Usuário solicite a exclusão nos termos da Política de Privacidade.",
      "7.5. O Usuário poderá, a qualquer momento, solicitar a eliminação ou anonimização de seus conteúdos, ressalvadas as informações cuja conservação seja necessária por obrigação legal, segurança, prevenção de fraude ou exercício regular de direitos.",
      "7.6. A Plataforma disponibiliza funcionalidade de exportação de receitas, listas de compras e relatórios nos formatos PDF e Excel, disponível a qualquer momento durante a vigência do plano contratado.",
    ],
  },
  {
    titulo: "8. Conteúdo inserido pelo Usuário",
    paragrafos: [
      "8.1. O Usuário preserva os direitos que legitimamente detenha sobre receitas, dados, textos, informações, custos, cardápios e demais conteúdos originais por ele inseridos na Plataforma.",
      "8.2. O Usuário concede à Empresa licença não exclusiva e limitada para armazenar, processar, reproduzir tecnicamente e exibir esses conteúdos exclusivamente na medida necessária para prestar as funcionalidades contratadas, realizar segurança e backups, atender solicitações de suporte e cumprir obrigações legais.",
      "8.3. Essa licença não autoriza a Empresa a comercializar receitas, custos, cardápios ou outras informações privadas identificáveis do Usuário como conteúdo próprio.",
      "8.4. O Usuário declara possuir legitimidade para inserir os conteúdos enviados à Plataforma e é responsável por não violar direitos autorais, segredos comerciais, dados pessoais ou outros direitos de terceiros.",
    ],
  },
  {
    titulo: "9. Conteúdo da Empresa e propriedade intelectual",
    paragrafos: [
      "9.1. A Plataforma, software, código, marca, identidade visual, layout, funcionalidades, documentação, banco de dados estruturado, textos e demais elementos desenvolvidos pela Empresa permanecem de titularidade da Empresa ou de seus respectivos licenciantes.",
      "9.2. O catálogo-base de receitas, ingredientes e outros materiais disponibilizados pela Empresa somente poderá ser utilizado dentro das condições oferecidas pela Plataforma.",
      "9.3. A contratação não transfere ao Usuário propriedade intelectual sobre a Plataforma ou sobre o conteúdo-base da Empresa.",
      "9.4. A criação ou adaptação de receita pelo Usuário a partir de conteúdo-base não transfere ao Usuário direitos sobre os elementos preexistentes de titularidade da Empresa ou de terceiros.",
    ],
  },
  {
    titulo: "10. Confidencialidade dos conteúdos do Usuário",
    paragrafos: [
      "10.1. Receitas privadas, custos, preços, informações de produção, cardápios e demais conteúdos não públicos cadastrados pelo Usuário serão tratados pela Empresa como informações de acesso restrito.",
      "10.2. A Empresa não utilizará essas informações para beneficiar outros usuários ou para finalidade comercial incompatível com a prestação da Plataforma.",
      "10.3. A Empresa poderá utilizar informações estatísticas efetivamente agregadas ou anonimizadas para análise de desempenho, segurança e aprimoramento da Plataforma, desde que não permitam identificar o Usuário ou revelar suas informações comerciais individualizadas.",
    ],
  },
  {
    titulo: "11. Uso adequado e condutas proibidas",
    paragrafos: ["11.1. É vedado ao Usuário:"],
    lista: [
      "utilizar a Plataforma para finalidade ilícita;",
      "acessar ou tentar acessar conta ou conteúdo pertencente a outro usuário;",
      "compartilhar acesso em desacordo com o plano contratado;",
      "explorar vulnerabilidade ou burlar controle de segurança;",
      "introduzir vírus, malware ou código malicioso;",
      "realizar scraping, extração automatizada ou coleta massiva sem autorização;",
      "realizar engenharia reversa, descompilar ou tentar reproduzir o software;",
      "copiar ou comercializar conteúdo protegido da Empresa fora das hipóteses autorizadas; ou",
      "violar direitos de propriedade intelectual, privacidade ou outros direitos de terceiros.",
    ],
  },
  {
    titulo: "12. Segurança alimentar, nutrição e obrigações regulatórias",
    paragrafos: [
      "12.1. As informações e cálculos disponibilizados pela Plataforma constituem recursos auxiliares.",
      "12.2. O Usuário deverá realizar conferência própria antes de utilizar informações relacionadas, entre outras, a alergênicos, informação nutricional, rotulagem, rendimento de receitas, prazo de validade, armazenamento e conservação de alimentos, condições de congelamento, segurança alimentar, precificação, margem, tributação e cumprimento de exigências sanitárias ou regulatórias.",
      "12.3. A Plataforma não substitui nutricionista, responsável técnico, contador, profissional de segurança alimentar ou outro profissional cuja atuação seja exigida ou recomendável conforme o caso.",
      "12.4. A Empresa não garante lucro, margem comercial, resultado nutricional, conformidade sanitária ou resultado econômico específico decorrente da utilização da Plataforma.",
      "12.5. Essas disposições não excluem eventual responsabilidade da Empresa por falha na prestação do serviço que lhe seja legalmente imputável.",
    ],
  },
  {
    titulo: "13. Disponibilidade e terceiros",
    paragrafos: [
      "13.1. A Empresa empregará esforços razoáveis para manter a Plataforma disponível e funcional.",
      "13.2. Poderão ocorrer interrupções decorrentes de manutenção, atualização, falhas de internet, infraestrutura, fornecedores tecnológicos, eventos de segurança, caso fortuito ou força maior.",
      "13.3. A Plataforma utiliza serviços de terceiros, inclusive para infraestrutura, hospedagem, envio de e-mails e mensagens, e pagamentos.",
      "13.4. A Empresa não controla integralmente a disponibilidade desses serviços de terceiros, sem prejuízo das responsabilidades que a legislação lhe atribua perante o Usuário.",
    ],
  },
  {
    titulo: "14. Suspensão e bloqueio",
    paragrafos: [
      "14.1. A Empresa poderá suspender preventivamente determinada conta quando houver indícios razoáveis de fraude, comprometimento de segurança, tentativa de acesso não autorizado, utilização ilícita ou violação relevante destes Termos.",
      "14.2. Sempre que compatível com a natureza da ocorrência, a Empresa comunicará o Usuário e permitirá a regularização antes de cancelamento definitivo.",
      "14.3. Violações graves, fraude, ataques à segurança ou situações que coloquem terceiros ou a Plataforma em risco poderão justificar suspensão imediata.",
    ],
  },
  {
    titulo: "15. Alterações da Plataforma",
    paragrafos: [
      "15.1. A Empresa poderá desenvolver, aprimorar, substituir ou descontinuar funcionalidades.",
      "15.2. Alterações não deverão eliminar, durante o período já pago, característica essencial que tenha integrado de forma determinante a oferta contratada, ressalvadas alterações necessárias por imposição legal, segurança, inviabilidade técnica superveniente ou evento fora do controle razoável da Empresa.",
      "15.3. Quando alteração material afetar significativamente um serviço já contratado, a Empresa adotará as medidas exigidas pela legislação aplicável.",
    ],
  },
  {
    titulo: "16. Alterações destes Termos",
    paragrafos: [
      "16.1. Estes Termos poderão ser atualizados para refletir mudanças legais, regulatórias, técnicas ou operacionais.",
      "16.2. A versão vigente indicará sua data de atualização.",
      "16.3. Alterações materiais serão comunicadas de forma adequada antes de sua aplicação quando afetarem direitos ou obrigações relevantes.",
      "16.4. Quando exigido pela legislação ou pela natureza da alteração, poderá ser solicitado novo aceite.",
      "16.5. Alteração posterior destes Termos não modificará retroativamente condições econômicas de período de acesso já integralmente contratado.",
    ],
  },
  {
    titulo: "17. Atendimento",
    paragrafos: [
      "17.1. O Usuário poderá contatar a Empresa para dúvidas, reclamações, cancelamentos e demais solicitações pelo seguinte canal de suporte: WhatsApp (51) 3416-0886.",
    ],
  },
  {
    titulo: "18. Legislação e foro",
    paragrafos: [
      "18.1. Estes Termos são regidos pela legislação brasileira.",
      "18.2. Ressalvadas as hipóteses em que a legislação assegure ao consumidor foro diverso, fica eleito o foro da comarca de Xangri-Lá/RS para resolução das controvérsias relacionadas a estes Termos.",
    ],
  },
  {
    titulo: "19. Disposições finais",
    paragrafos: [
      "19.1. A eventual invalidade de uma disposição não prejudicará as demais.",
      "19.2. A tolerância da Empresa quanto a determinado descumprimento não constitui renúncia permanente ao direito de exigir cumprimento futuro.",
      "19.3. A Política de Privacidade integra as regras aplicáveis à utilização da Plataforma em relação ao tratamento de dados pessoais.",
    ],
  },
  {
    titulo: "20. Vigência",
    paragrafos: [
      "20.1. Estes Termos entram em vigor em 18/08/2026 e permanecem válidos por prazo indeterminado, aplicando-se a todas as contratações realizadas a partir desta data.",
      "20.2. A versão vigente destes Termos está sempre disponível na Plataforma. Alterações futuras serão comunicadas na forma do item 16, e a data de atualização será sempre indicada no cabeçalho deste documento.",
      "20.3. O aceite destes Termos e da Política de Privacidade é condição obrigatória para a criação de conta e para cada nova contratação paga, realizado por meio de confirmação explícita do Usuário (ex.: marcação de caixa de aceite) antes da conclusão do respectivo processo.",
    ],
  },
];

export default function Termos() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-heading font-semibold text-primary mb-6">
          Termos de Uso
        </h1>

        <div className="mb-8 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="bg-secondary/60 font-medium px-4 py-2 w-40">Empresa</td>
                <td className="px-4 py-2">NUTRIMENU LTDA.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="bg-secondary/60 font-medium px-4 py-2">CNPJ</td>
                <td className="px-4 py-2">53.301.456/0001-58</td>
              </tr>
              <tr className="border-b border-border">
                <td className="bg-secondary/60 font-medium px-4 py-2">Sede</td>
                <td className="px-4 py-2">Rua Jacuí, 51 — Xangri-Lá/RS</td>
              </tr>
              <tr className="border-b border-border">
                <td className="bg-secondary/60 font-medium px-4 py-2">E-mail oficial</td>
                <td className="px-4 py-2">contato@nutrimenu.com.br</td>
              </tr>
              <tr>
                <td className="bg-secondary/60 font-medium px-4 py-2">Última atualização</td>
                <td className="px-4 py-2">18/08/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-foreground/90 leading-relaxed mb-8">
          Estes Termos de Uso regulam o acesso e a utilização da plataforma Laboratório de
          Cozinha. Leia este documento antes de utilizar a Plataforma.
        </p>

        <div className="space-y-8">
          {SECOES.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="text-xl font-heading font-semibold text-primary mb-3">
                {secao.titulo}
              </h2>
              <div className="space-y-3 text-foreground/90 leading-relaxed">
                {secao.paragrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {secao.lista && (
                  <ul className="list-disc pl-6 space-y-1">
                    {secao.lista.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                {secao.posLista?.map((p, i) => (
                  <p key={`pos-${i}`}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border text-foreground/90">
          <p className="font-medium">NUTRIMENU LTDA.</p>
          <p>Xangri-Lá/RS, 18 de agosto de 2026.</p>
        </div>
      </div>
    </div>
  );
}