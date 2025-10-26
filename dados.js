/* =======================================================
   BLOCO O — Integração com Dados da Planilha
   Código do Lucro — Sistema de Precificação Inteligente
========================================================= */

// Simulação da base de dados importada da planilha
// (posteriormente você poderá automatizar a leitura via JSON ou Google Sheets)

const dadosPlanilha = {
  lojas: [
    {
      nome: "Loja 1",
      mesReferencia: "10/2025",
      faturamentoBruto: 12450.0,
      dnaTotal: 22.5,
      despesasFixas: 4350.0,
      insumos: 12,
      itensCadastrados: 4,
      lucroLiquido: 8100.0,
      pvMedio: 10.32,
      cmvMedio: 4.22
    }
  ]
};

// Funções de atualização automática
function atualizarDashboard() {
  const loja = dadosPlanilha.lojas[0]; // por enquanto, primeira loja
  if (!loja) return;

  // Atualiza valores principais
  document.getElementById("faturamentoValor").textContent = `R$ ${loja.faturamentoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  document.getElementById("lucroValor").textContent = `${loja.dnaTotal.toFixed(1)} %`;
  document.getElementById("pvValor").textContent = `R$ ${loja.pvMedio.toFixed(2)}`;
  document.getElementById("cmvValor").textContent = `R$ ${loja.cmvMedio.toFixed(2)}`;
  document.getElementById("lucroLiquidoValor").textContent = `R$ ${loja.lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

// Chama a função ao iniciar
document.addEventListener("DOMContentLoaded", atualizarDashboard);
