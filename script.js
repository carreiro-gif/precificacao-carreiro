// script.js — versão simples e funcional para onclick inline
// Estado salvo no localStorage
const STORAGE_KEY = 'carreiro.precificacao.v1';

function _load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { lojas: [], lojaAtivaId: null, ultimaAtualizacao: null };
  }catch(e){
    console.warn('Falha ao carregar estado', e);
    return { lojas: [], lojaAtivaId: null, ultimaAtualizacao: null };
  }
}
function _save(state){
  state.ultimaAtualizacao = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = _load();

// Utilidades
function _uid(){ return (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) }

function _getLojaAtiva(){
  return state.lojas.find(l => l.id === state.lojaAtivaId) || null;
}

function _setLojaAtiva(id){
  state.lojaAtivaId = id;
  _save(state);
  render();
}

function _formatDate(iso){
  return iso ? new Date(iso).toLocaleString('pt-BR') : '—';
}

// ====== FUNÇÕES CHAMADAS PELO HTML (onclick) ======

// Botão "Nova loja"
function novaloja(){
  const id = _uid();
  const loja = {
    id,
    nome: `Loja ${state.lojas.length + 1}`,
    logo: null,
    dna: {},
    faturamento: {},
    insumos: [],
    fichas: [],
    pv: {},
    combos: []
  };
  state.lojas.push(loja);
  state.lojaAtivaId = id;
  _save(state);
  render();
}

// Botão "Duplicar loja" (se você tiver um botão que chama duplicar direto)
function duplicar(){
  const atual = _getLojaAtiva();
  if(!atual){ alert('Nenhuma loja selecionada.'); return; }
  const id = _uid();
  const clone = JSON.parse(JSON.stringify(atual));
  clone.id = id;
  clone.nome = `${atual.nome} (cópia)`;
  state.lojas.push(clone);
  state.lojaAtivaId = id;
  _save(state);
  render();
}

// Botão "Salvar nome" (pega do input #nomeLoja)
function salvarNome(){
  const atual = _getLojaAtiva();
  if(!atual){ alert('Nenhuma loja selecionada.'); return; }
  const input = document.getElementById('nomeLoja');
  if(!input){ alert('Campo de nome não encontrado.'); return; }
  const novo = input.value.trim();
  if(novo) atual.nome = novo;
  _save(state);
  render();
}

// Botão "Voltar" (se você usa para trocar tela/aba)
function voltar(){
  // Exemplo: volta para o dashboard
  showSection('dashboard');
}

// Trocar de seção/aba. Ex.: onclick="showSection('dna')"
function showSection(sectionId){
  // Desativa todas as tabs e ativa a tab correspondente (se existir)
  document.querySelectorAll('.tab').forEach(tab=>{
    const slug = tab.dataset.tab; // ex: 'dashboard'
    tab.classList.toggle('active', slug === sectionId);
  });

  // Mostra o painel correto
  document.querySelectorAll('.tab-panel').forEach(panel=>{
    panel.classList.toggle('active', panel.id === sectionId || panel.id === `tab-${sectionId}`);
  });
}

// Abrir loja pela lista (vamos criar o atributo data-abrir no botão de abrir)
function abrirLoja(id){
  _setLojaAtiva(id);
}

// Alterar logo (chamar via input file onchange="alterarLogo(this)")
function alterarLogo(input){
  const file = input?.files?.[0];
  const atual = _getLojaAtiva();
  if(!file || !atual){ return; }
  const reader = new FileReader();
  reader.onload = () => {
    atual.logo = reader.result; // base64
    _save(state);
    render();
  };
  reader.readAsDataURL(file);
}

// ====== RENDER ======
function render(){
  // Preenche lista de lojas
  const ul = document.getElementById('listaLojas');
  if(ul){
    ul.innerHTML = '';
    state.lojas.forEach(l=>{
      const li = document.createElement('li');
      li.className = (l.id === state.lojaAtivaId) ? 'active' : '';
      li.innerHTML = `
        <span>${l.nome}</span>
        <span class="loja-actions">
          <button class="btn" onclick="abrirLoja('${l.id}')">Abrir</button>
        </span>
      `;
      ul.appendChild(li);
    });
  }

  // Atualiza KPIs simples (se existirem)
  const total = document.getElementById('totalLojas');
  if(total) total.textContent = state.lojas.length;

  const ultima = document.getElementById('ultimaAtualizacao');
  if(ultima) ultima.textContent = _formatDate(state.ultimaAtualizacao);

  // Atualiza input de nome conforme loja ativa
  const loja = _getLojaAtiva();
  const nomeInput = document.getElementById('nomeLoja');
  if(nomeInput) nomeInput.value = loja?.nome || '';

  // Atualiza logo no header (se existir .logo)
  const logoEl = document.querySelector('.logo');
  if(logoEl) {
    if(loja?.logo) logoEl.src = loja.logo;
    else logoEl.src = 'assets/logo.png';
  }
}

// ====== INICIALIZA ======
document.addEventListener('DOMContentLoaded', ()=>{
  // Se não houver loja, cria uma inicial para evitar telas vazias
  if(state.lojas.length === 0){
    novaloja();
  }else{
    // garante seleção válida
    if(!state.lojaAtivaId || !_getLojaAtiva()){
      state.lojaAtivaId = state.lojas[0].id;
      _save(state);
    }
    render();
  }

  // Se você tiver botões sem onclick no HTML, pode ligar aqui também (opcional):
  // const btnNova = document.getElementById('btnNovaLoja');
  // if(btnNova) btnNova.addEventListener('click', novaloja);
});
