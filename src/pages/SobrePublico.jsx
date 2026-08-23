import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SobrePublico() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Sobre o Laboratório de Cozinha | Quem somos e o que fazemos";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main className="min-h-screen" style={{ background: "#EDE0CC", color: "#3B4A2F" }}>
      <div className="max-w-2xl mx-auto px-5 py-10 md:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 hover:underline"
          style={{ color: "#7B2D00" }}
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao início
        </Link>

        <h1
          className="font-heading text-3xl md:text-4xl font-bold leading-tight mb-6"
          style={{ color: "#3B4A2F" }}
        >
          Sobre o Laboratório de Cozinha
        </h1>

        <div className="space-y-5 text-base leading-relaxed" style={{ color: "#3B4A2F" }}>
          <p>
            O <strong>Laboratório de Cozinha</strong> é uma plataforma de planejamento gastronômico
            profissional criada para quem vive de cozinha — chefs, nutricionistas, donas de marmitaria,
            buffet, confeitaria e quem gerencia produção alimentar de verdade. Reunimos em um só lugar
            o que antes ficava espalhado em cadernos, planilhas e memória: receitas escaláveis, fichas
            técnicas, cálculo de custo por porção, per capita, rendimento, fator de correção, listas de
            compras automáticas e cardápios completos para eventos.
          </p>
          <p>
            A ferramenta nasce da vivência prática de <strong>Carmen Reinstein</strong>, nutricionista que
            começou a cozinhar aos 5 anos numa cozinha a lenha na fronteira com o Uruguai. Anos depois,
            fundou a BRUBINS — indústria de alimentos congelados ativa desde 1984 — e foi cuidando da
            produção que percebeu que fichas técnicas manuais não davam mais conta. Ainda nos anos 80
            começou a programar o primeiro sistema de gestão de produção da própria empresa. Décadas
            calculando rendimento, custo e produção na prática se transformaram agora nesta ferramenta
            digital: não é teoria, é o caderno de receitas de uma vida inteira convertido em software.
          </p>
          <p>
            O Laboratório de Cozinha é para quem precisa escalar receitas sem perder a precisão, precificar
            com segurança e organizar cardápios por pessoa, por evento ou por semana. Aqui cada
            ingrediente tem preço, cada receita tem custo, e cada cardápio vira orçamento — sem
            planilhas quebradas e sem cálculos de cabeça.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold text-white shadow"
            style={{ background: "#3B4A2F" }}
          >
            Começar 7 dias grátis
          </Link>
          <Link
            to="/contato"
            className="inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold border"
            style={{ borderColor: "#3B4A2F", color: "#3B4A2F" }}
          >
            Falar com a equipe
          </Link>
        </div>
      </div>
    </main>
  );
}