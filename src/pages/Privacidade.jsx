import React from "react";

const SECOES = [
  {
    titulo: "1. Dados coletados",
    paragrafos: ["1.1. A Empresa coleta as seguintes categorias de dados:"],
    lista: [
      "Dados de cadastro: nome, e-mail, telefone/WhatsApp, nome do negócio ou empresa, quando informado;",
      "Dados de uso: receitas, ingredientes, cardápios, planejamentos, histórico de alterações e demais conteúdos inseridos na Plataforma;",
      "Dados de pagamento: processados diretamente pelo prestador de pagamento (atualmente Mercado Pago); a Empresa não armazena números completos de cartão de crédito;",
      "Dados técnicos: endereço IP, tipo de dispositivo e navegador, registros de acesso, para fins de segurança e prevenção de fraude.",
    ],
  },
  {
    titulo: "2. Finalidade do tratamento",
    paragrafos: ["2.1. Os dados pessoais são tratados para as seguintes finalidades:"],
    lista: [
      "viabilizar o funcionamento da Plataforma e das funcionalidades contratadas;",
      "processar pagamentos e gerenciar o acesso ao plano contratado;",
      "enviar comunicações operacionais (confirmações de cadastro e pagamento, avisos de vencimento, suporte);",
      "cumprir obrigações legais e regulatórias;",
      "prevenir fraudes e garantir a segurança da Plataforma;",
      "melhorar a Plataforma com base em dados de uso agregados e anonimizados.",
    ],
  },
  {
    titulo: "3. Base legal",
    paragrafos: [
      "3.1. O tratamento de dados pessoais pela Empresa se fundamenta, conforme o caso: na execução de contrato do qual o titular é parte (art. 7º, V, LGPD); no cumprimento de obrigação legal ou regulatória (art. 7º, II); no consentimento do titular, quando aplicável (art. 7º, I); e no legítimo interesse da Empresa para prevenção de fraude e segurança da Plataforma (art. 7º, IX), sempre respeitados os direitos e liberdades fundamentais do titular.",
    ],
  },
  {
    titulo: "4. Compartilhamento de dados",
    paragrafos: [
      "4.1. Os dados pessoais podem ser compartilhados com os seguintes operadores, na medida estritamente necessária à prestação do serviço:",
    ],
    lista: [
      "Base44 — plataforma de infraestrutura, hospedagem e banco de dados da aplicação;",
      "Mercado Pago — processamento de pagamentos;",
      "Resend — envio de e-mails transacionais;",
      "Wascript/To Talk — envio de mensagens via WhatsApp;",
      "Google (Google Analytics) — mensuração de audiência do site;",
      "Meta (Facebook/Instagram) — mensuração e direcionamento de campanhas publicitárias;",
      "autoridades públicas, mediante obrigação legal ou ordem judicial.",
    ],
    posLista: [
      "4.2. A Empresa não vende, aluga ou comercializa dados pessoais de usuários a terceiros.",
    ],
  },
  {
    titulo: "5. Direitos do titular dos dados",
    paragrafos: [
      "5.1. Nos termos do art. 18 da LGPD, o Usuário pode, a qualquer momento, solicitar à Empresa:",
    ],
    lista: [
      "confirmação da existência de tratamento de seus dados;",
      "acesso aos dados;",
      "correção de dados incompletos, inexatos ou desatualizados;",
      "anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;",
      "portabilidade dos dados a outro fornecedor de serviço, mediante requisição expressa;",
      "eliminação dos dados pessoais tratados com base no consentimento, quando aplicável;",
      "informação sobre as entidades públicas e privadas com as quais a Empresa realizou uso compartilhado de dados;",
      "revogação do consentimento, quando aplicável.",
    ],
    posLista: [
      "5.2. As solicitações podem ser feitas pelo canal de suporte: WhatsApp (51) 3416-0886.",
      "5.3. A Empresa responderá às solicitações dentro dos prazos estabelecidos pela LGPD, podendo solicitar informações adicionais para confirmar a identidade do titular antes de processar o pedido.",
    ],
  },
  {
    titulo: "6. Retenção de dados",
    paragrafos: [
      "6.1. Os dados pessoais são mantidos pelo período em que a conta do Usuário estiver ativa.",
      "6.2. Após o término ou a não renovação do plano contratado, os dados permanecem armazenados por prazo indeterminado, possibilitando eventual reativação da conta, até que o titular solicite a exclusão nos termos do item 5 desta Política, ou até que a Empresa não possua mais base legal para a manutenção dos dados.",
      "6.3. Ainda que solicitada a exclusão, determinadas informações poderão ser conservadas quando necessário para cumprimento de obrigação legal ou regulatória, exercício regular de direitos em processo judicial, administrativo ou arbitral, ou prevenção de fraude.",
    ],
  },
  {
    titulo: "7. Segurança da informação",
    paragrafos: [
      "7.1. A Empresa adota medidas técnicas e organizacionais razoáveis para proteger os dados pessoais contra acessos não autorizados, perda, alteração ou destruição, incluindo controle de acesso por conta (isolamento de dados entre clientes) e as práticas de segurança disponibilizadas pela infraestrutura da Base44.",
      "7.2. Nenhum sistema é absolutamente seguro; em caso de incidente de segurança que possa acarretar risco relevante aos titulares, a Empresa adotará as medidas de comunicação exigidas pela LGPD.",
    ],
  },
  {
    titulo: "8. Encarregado de Dados",
    paragrafos: [
      "8.1. Para exercer os direitos previstos nesta Política ou esclarecer dúvidas sobre o tratamento de dados pessoais, o Usuário pode entrar em contato pelo canal de suporte: WhatsApp (51) 3416-0886.",
    ],
  },
  {
    titulo: "9. Cookies e tecnologias de rastreamento",
    paragrafos: [
      "9.1. A Plataforma e seu site público utilizam cookies e tecnologias semelhantes para funcionamento técnico, mensuração de audiência e publicidade direcionada, incluindo:",
    ],
    lista: [
      "Google Analytics — para mensuração de tráfego, origem dos visitantes e comportamento de navegação no site;",
      "Meta Pixel (Facebook/Instagram) — para mensuração de campanhas publicitárias veiculadas nessas plataformas e para direcionamento de anúncios a visitantes do site.",
    ],
    posLista: [
      "9.2. Essas ferramentas podem coletar dados como endereço IP, identificadores de dispositivo, páginas visitadas e interações no site, de acordo com as políticas de privacidade próprias do Google e da Meta.",
      "9.3. O Usuário pode gerenciar ou desativar cookies diretamente nas configurações de seu navegador, o que pode limitar algumas funcionalidades do site. Informações adicionais sobre como essas empresas tratam os dados coletados por essas ferramentas estão disponíveis nas respectivas políticas de privacidade do Google e da Meta.",
    ],
  },
  {
    titulo: "10. Alterações desta Política",
    paragrafos: [
      "10.1. Esta Política pode ser atualizada periodicamente para refletir mudanças legais, regulatórias, técnicas ou operacionais.",
      "10.2. A versão vigente estará sempre disponível na Plataforma, com a data da última atualização indicada no cabeçalho deste documento.",
      "10.3. Alterações materiais que afetem significativamente os direitos dos titulares serão comunicadas de forma adequada antes de sua aplicação.",
    ],
  },
  {
    titulo: "11. Legislação e foro",
    paragrafos: [
      "11.1. Esta Política é regida pela legislação brasileira, em especial a Lei nº 13.709/2018 (LGPD) e o Código de Defesa do Consumidor, quando aplicável.",
      "11.2. Ressalvadas as hipóteses em que a legislação assegure ao consumidor foro diverso, fica eleito o foro da comarca de Xangri-Lá/RS.",
    ],
  },
];

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-heading font-semibold text-primary mb-6">
          Política de Privacidade
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
              <tr className="border-b border-border">
                <td className="bg-secondary/60 font-medium px-4 py-2">Canal de atendimento</td>
                <td className="px-4 py-2">WhatsApp (51) 3416-0886</td>
              </tr>
              <tr>
                <td className="bg-secondary/60 font-medium px-4 py-2">Última atualização</td>
                <td className="px-4 py-2">18/08/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-foreground/90 leading-relaxed mb-8">
          Esta Política de Privacidade descreve como a NUTRIMENU LTDA. ("Empresa") coleta, usa,
          armazena e protege os dados pessoais dos usuários da plataforma Laboratório de Cozinha
          ("Plataforma"), em conformidade com a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018 — LGPD) e demais legislação aplicável.
        </p>

        {SECOES.length === 0 ? (
          <p className="text-muted-foreground">Conteúdo em breve.</p>
        ) : (
          <div className="space-y-8">
            {SECOES.map((secao) => (
              <section key={secao.titulo}>
                <h2 className="text-xl font-heading font-semibold text-primary mb-3">
                  {secao.titulo}
                </h2>
                <div className="space-y-3 text-foreground/90 leading-relaxed">
                  {secao.paragrafos?.map((p, i) => (
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
        )}

        <div className="mt-10 pt-6 border-t border-border text-foreground/90">
          <p className="font-medium">NUTRIMENU LTDA.</p>
          <p>Xangri-Lá/RS, 18 de agosto de 2026.</p>
        </div>
      </div>
    </div>
  );
}