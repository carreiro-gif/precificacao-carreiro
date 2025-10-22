// ====== Estado no localStorage ======
const STORAGE_KEY = 'carreiro.precificacao.v1';

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { lojas: [], lojaAtivaId: null, ultimaAtualizacao: null };
  }catch(e){
    console.warn('Falha ao carregar estado', e);
    return { lojas: [], lojaAtivaId: null, ultimaAtualizacao: null };
  }
}
function saveState(state){
  state.ultimaAtualizacao = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function uid(){ return (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) }
function getLojaAtiva(){ return state.lojas.find(l => l.id === state.lojaAtivaId) || null }
function setLojaAtiva(id){ state.lojaAtivaId = id; saveState(state); render(); }
function fmtData(iso){ return iso ? new Date(iso).toLocaleString('pt-BR') : '—' }

// ====== Funções chamadas pelo HTML (onclick inline) ======
function novaloja(){
  const id = uid();
  state.lojas.push({ id, nome: `Loja ${state.lojas.length + 1}`, logo: null, dna:{}, faturamento:{}, insumos:[], fichas:[], pv:{}, combos:[] });
  state.lojaAtivaId = id;
  saveState(state);
  render();
}

function duplicar(){
  const atual = getLojaAtiva();
  if(!atual){ alert('Nenhuma loja selecionada.'); return; }
  const id = uid();
  const clone = JSON.parse(JSON.stringify(atual));
  clone.id = id; clone.nome = `${atual.nome} (cópia)`;
  state.lojas.push(clone);
  state.lojaAtivaId = id;
  saveState(state);
  render();
}

function salvarNome(){
  const atual = getLojaAtiva();
  if(!atual){ alert('Nenhuma loja selecionada.'); return; }
  const input = document.getElementById('nomeLoja');
  if(!input){ alert('Campo de nome não encontrado'); return; }
  const novo = input.value.trim();
  if(novo) atual.nome = novo;
  saveState(state);
  render();
}

function voltar(){ showSection('dashboard'); }

function showSection(sectionId){
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === sectionId);
  });
  // Painéis
  document.querySelectorAll('.tab-panel').forEach(p => {
    const match = p.id === sectionId || p.id === `tab-${sectionId}`;
    p.classList.toggle('active', match);
  });
}

function abrirLoja(id){ setLojaAtiva(id); }

function alterarLogo(input){
  const file = input?.files?.[0];
  const atual = getLojaAtiva();
  if(!file || !atual) return;
  const reader = new FileReader();
  reader.onload = () => { atual.logo = reader.result; saveState(state); render(); };
  reader.readAsDataURL(file);
}

// ====== Render ======
function render(){
  // Lista de lojas
  const ul = document.getElementById('listaLojas');
  if(ul){
    ul.innerHTML = '';
    state.lojas.forEach(l => {
      const li = document.createElement('li');
      li.className = l.id === state.lojaAtivaId ? 'active' : '';
      li.innerHTML = `
        <span>${l.nome}</span>
        <span class="loja-actions">
          <button class="btn" onclick="abrirLoja('${l.id}')">Abrir</button>
        </span>`;
      ul.appendChild(li);
    });
  }
  // KPIs
  const total = document.getElementById('totalLojas'); if(total) total.textContent = state.lojas.length;
  const ultima = document.getElementById('ultimaAtualizacao'); if(ultima) ultima.textContent = fmtData(state.ultimaAtualizacao);

  // Nome/Logo
  const loja = getLojaAtiva();
  const nomeInput = document.getElementById('nomeLoja'); if(nomeInput) nomeInput.value = loja?.nome || '';
  const logoEl = document.querySelector('.logo');
  if(logoEl) logoEl.src = loja?.logo || logoEl.src; // mantém SVG se não tiver logo personalizada
}

// ====== Inicialização ======
document.addEventListener('DOMContentLoaded', () => {
  // Se estiver vazio, cria uma loja inicial
  if(state.lojas.length === 0){
    const id = uid();
    state.lojas.push({ id, nome: 'Loja 1', logo: null, dna:{}, faturamento:{}, insumos:[], fichas:[], pv:{}, combos:[] });
    state.lojaAtivaId = id;
    saveState(state);
  }else{
    if(!getLojaAtiva()){ state.lojaAtivaId = state.lojas[0].id; saveState(state); }
  }

  // Segurança extra: se o HTML não usar onclick, ainda assim ligamos as abas por data-tab
  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=> showSection(btn.dataset.tab));
  });

  render();
});
