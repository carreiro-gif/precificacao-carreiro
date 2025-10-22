// Estado no localStorage
const STORAGE_KEY = 'carreiro.precificacao.v1';

function _load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { lojas: [], lojaAtivaId: null, ultimaAtualizacao: null };
  }catch(e){
    return { lojas: [], lojaAtivaId: null, ultimaAtualizacao: null };
  }
}
function _save(state){
  state.ultimaAtualizacao = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
let state = _load();

function _uid(){ return (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) }
function _getLojaAtiva(){ return state.lojas.find(l => l.id === state.lojaAtivaId) || null }
function _formatDate(iso){ return iso ? new Date(iso).toLocaleString('pt-BR') : '—' }

function novaloja(){
  const id = _uid();
  state.lojas.push({ id, nome: `Loja ${state.lojas.length + 1}`, logo: null, dna:{}, faturamento:{}, insumos:[], fichas:[], pv:{}, combos:[] });
  state.lojaAtivaId = id;
  _save(state);
  render();
}
function duplicar(){
  const atual = _getLojaAtiva();
  if(!atual){ alert('Nenhuma loja selecionada.'); return; }
  const id = _uid();
  const clone = JSON.parse(JSON.stringify(atual));
  clone.id = id; clone.nome = `${atual.nome} (cópia)`;
  state.lojas.push(clone); state.lojaAtivaId = id; _save(state); render();
}
function salvarNome(){
  const atual = _getLojaAtiva();
  if(!atual){ alert('Nenhuma loja selecionada.'); return; }
  const input = document.getElementById('nomeLoja');
  if(!input){ alert('Campo nome não encontrado'); return; }
  const novo = input.value.trim();
  if(novo) atual.nome = novo;
  _save(state); render();
}
function voltar(){ showSection('dashboard'); }
function showSection(sectionId){
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === sectionId));
  document.querySelectorAll('.tab-panel').forEach(p => {
    const idOk = p.id === sectionId || p.id === `tab-${sectionId}`;
    p.classList.toggle('active', idOk);
  });
}
function abrirLoja(id){
  state.lojaAtivaId = id; _save(state); render();
}
function alterarLogo(input){
  const file = input?.files?.[0]; const atual = _getLojaAtiva();
  if(!file || !atual) return;
  const reader = new FileReader();
  reader.onload = () => { atual.logo = reader.result; _save(state); render(); };
  reader.readAsDataURL(file);
}

// Render
function render(){
  const ul = document.getElementById('listaLojas');
  if(ul){
    ul.innerHTML = '';
    state.lojas.forEach(l=>{
      const li = document.createElement('li');
      li.className = l.id === state.lojaAtivaId ? 'active' : '';
      li.innerHTML = `<span>${l.nome}</span>
        <span class="loja-actions"><button class="btn" onclick="abrirLoja('${l.id}')">Abrir</button></span>`;
      ul.appendChild(li);
    });
  }
  const total = document.getElementById('totalLojas'); if(total) total.textContent = state.lojas.length;
  const ultima = document.getElementById('ultimaAtualizacao'); if(ultima) ultima.textContent = _formatDate(state.ultimaAtualizacao);
  const loja = _getLojaAtiva();
  const nomeInput = document.getElementById('nomeLoja'); if(nomeInput) nomeInput.value = loja?.nome || '';
  const logoEl = document.querySelector('.logo'); if(logoEl) logoEl.src = (loja?.logo || 'assets/logo.png');
}

// Inicializa
document.addEventListener('DOMContentLoaded', ()=>{
  if(state.lojas.length === 0){ novaloja(); } else { if(!_getLojaAtiva()){ state.lojaAtivaId = state.lojas[0].id; _save(state); } render(); }
});
