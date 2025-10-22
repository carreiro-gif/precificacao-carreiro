// ====== Teste mínimo: expõe funções globais usadas no HTML ======
window.novaloja = function novaloja(){ alert('Nova loja! (teste)'); }

window.duplicar = function duplicar(){ alert('Duplicar loja! (teste)'); }

window.salvarNome = function salvarNome(){ alert('Salvar nome! (teste)'); }

window.voltar = function voltar(){ alert('Voltar para dashboard! (teste)'); }

window.showSection = function showSection(sectionId){
  // Alterna abas simples (procura .tab e .tab-panel)
  document.querySelectorAll('.tab').forEach(tab=>{
    tab.classList.toggle('active', tab.dataset.tab === sectionId);
  });
  document.querySelectorAll('.tab-panel').forEach(p=>{
    p.classList.toggle('active', p.id === sectionId || p.id === `tab-${sectionId}`);
  });
  console.log('Seção ativa:', sectionId);
};

// Log simples para confirmar carregamento do JS
console.log('script.js carregado e funções globais definidas.');
