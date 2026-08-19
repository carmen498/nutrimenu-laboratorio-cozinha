import React from "react";

const SECOES = [
  // TODO: aguardando o conteúdo completo da Política de Privacidade para preencher
  // as seções no mesmo padrão de src/pages/Termos.jsx (titulo, paragrafos, lista, posLista).
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
              <tr>
                <td className="bg-secondary/60 font-medium px-4 py-2">Última atualização</td>
                <td className="px-4 py-2">18/08/2026</td>
              </tr>
            </tbody>
          </table>
        </div>

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