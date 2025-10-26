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
/* ================= PV MODULE (START) ================= */
(function PVModule(){
  const KEYS = { state: ['precificacaoState','carreiroState','pricingState'], ctx: 'pv_context' };
  const $ = s => document.querySelector(s);
  const money = v => isFinite(v)? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—';
  const pct = v => isFinite(v)? (v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%' : '—';
  const setStatus = t => { const el=$('#pv_status'); if (el) { el.textContent = t||''; setTimeout(()=>{ el.textContent=''; }, 3500); } };

  function loadState(){
    for(const k of KEYS.state){
      const raw = localStorage.getItem(k);
      if (raw) { try { const o=JSON.parse(raw); o.__key=k; return o; } catch(e){} }
    }
    // fallback: maior JSON do localStorage
    let best=null, bestK=null;
    for(const k of Object.keys(localStorage)){
      const raw = localStorage.getItem(k)||'';
      if (raw.startsWith('{') && raw.length > (best?.length||0)) { best = raw; bestK = k; }
    }
    if (best) { try { const o=JSON.parse(best); o.__key=bestK; return o; } catch(e){} }
    return null;
  }
  function saveState(app){ const k=app?.__key||KEYS.state[0]; if(!k) return; const clone={...app}; delete clone.__key; localStorage.setItem(k, JSON.stringify(clone)); }
  function loadCtx(){ try{return JSON.parse(localStorage.getItem(KEYS.ctx)||'{}')}catch(e){return{}} }
  function saveCtx(o){ localStorage.setItem(KEYS.ctx, JSON.stringify(o||{})); }
  function parseMonth(){ const inp=$('#pv_mesano'); if(!inp?.value) return null; const [y,m]=inp.value.split('-').map(n=>parseInt(n,10)); return {ano:y,mes:m}; }
  function parseCSV(text){ return (text||'').trim().split(/\r?\n/).filter(Boolean).map(l=>l.split(',').map(s=>s.trim())); }

  let app = loadState();
  if(!app){
    app = {
      lojas:[{
        id:'lojax', nome:'Loja Demo',
        fichas:[{ id:'carreirinho', nome:'CARREIRINHO', custoTotal:4.222658250449939 }],
        dna:[{ano:2025,mes:9,totalFixosMes:4951.12}],
        faturamento:[{ano:2025,mes:9,faturamento:18037.58}],
        variaveis:{ prefs:{margemAlvoPercent:20, regraArred:'none'}, taxaMarketplacePercent:17, entregaReais:9 }
      }]
    };
    app.__key = KEYS.state[0]; saveState(app);
  }

  function getLoja(){
    const sel=$('#pv_loja');
    const id = sel?.value;
    const l = (app.lojas||[]).find(x=>x.id===id) || (app.lojas||[])[0];
    return l;
  }
  function initLojaSelect(){
    const sel=$('#pv_loja'); if(!sel) return;
    sel.innerHTML = '';
    (app.lojas||[]).forEach(l=>{
      const o=document.createElement('option');
      o.value=l.id; o.textContent=l.nome||l.id; sel.appendChild(o);
    });
    const ctx=loadCtx(); if(ctx?.lojaId && (app.lojas||[]).some(l=>l.id===ctx.lojaId)) sel.value = ctx.lojaId;
    sel.addEventListener('change', ()=>{ saveCtx({lojaId: sel.value}); initFichaSelect(); });
  }
  function initFichaSelect(){
    const loja=getLoja();
    const sel=$('#pv_ficha'); if(!sel) return;
    sel.innerHTML='';
    (loja?.fichas||[]).forEach(f=>{
      const o=document.createElement('option');
      o.value=f.id; o.textContent=f.nome||f.id; sel.appendChild(o);
    });
    updateCMV();
  }
  function updateCMV(){
    const loja=getLoja(); const fId=$('#pv_ficha')?.value;
    const ficha=(loja?.fichas||[]).find(x=>x.id===fId);
    let custo = Number(ficha?.custoTotal ?? 0);
    if(!ficha?.custoTotal && ficha?.itens && loja?.insumos){
      const map = new Map((loja.insumos||[]).map(i=>[i.id,i]));
      custo=0;
      for(const it of (ficha.itens||[])){
        const ins=map.get(it.insumoId); if(!ins) continue;
        const custoCompra=Number(ins.custoCompra||0);
        const qtdCompra=Number(ins.qtdCompra||1);
        const perda=(Number(ins.perdaPercent||ins.perda||0)/100);
        const unit = qtdCompra>0 ? (custoCompra/qtdCompra)/(1-perda) : 0;
        custo += unit * Number(it.qtd||it.quantidade||0);
      }
    }
    const cmv = (Math.round((custo||0)*1e6)/1e6);
    const input=$('#pv_cmv'); if(input) input.value = cmv;
  }

  function puxarMes(){
    const loja=getLoja(); const mm=parseMonth(); if(!mm) return;
    const cf=(loja?.dna||[]).find(d=>d.ano===mm.ano && d.mes===mm.mes);
    const fat=(loja?.faturamento||[]).find(f=>f.ano===mm.ano && f.mes===mm.mes);
    if(cf) $('#pv_cfMes').value = Number(cf.totalFixosMes ?? cf.total ?? 0);
    if(fat) $('#pv_fatMes').value = Number(fat.faturamento ?? fat.receitaBruta ?? 0);
    calcCFPct(); setStatus('Valores do mês carregados.');
  }
  function calcCFPct(){
    const cf=Number($('#pv_cfMes')?.value||0), fat=Number($('#pv_fatMes')?.value||0);
    if($('#pv_cfPct')) $('#pv_cfPct').value = fat>0? (cf/fat*100).toFixed(6) : '';
    calcDNAPct();
  }
  function calcDNAPct(){
    const cf=Number($('#pv_cfPct')?.value||0),
          c =Number($('#pv_cartoesPct')?.value||0),
          v =Number($('#pv_voucherPct')?.value||0),
          i =Number($('#pv_impostoPct')?.value||0),
          r =Number($('#pv_royaltyPct')?.value||0),
          m =Number($('#pv_mktPct')?.value||0);
    if($('#pv_dnaPct')) $('#pv_dnaPct').value = (cf+c+v+i+r+m).toFixed(6);
  }
  function calcRateio(){
    const por=Number($('#pv_porcoesMes')?.value||0),
          dn =Number($('#pv_dnaReaisMes')?.value||0);
    if($('#pv_dnaPorcao')) $('#pv_dnaPorcao').value = por>0 ? (dn/por).toFixed(2) : '';
  }

  function ceilRule(valor, regra){
    const cents = v=>Math.round(v*100)/100;
    const ceilTo = (v,m)=>Math.ceil(v/m)*m;
    if(!isFinite(valor)) return NaN;
    switch(regra){
      case '99':{ const i=Math.floor(valor), cand=i+0.99; return cents(cand>=valor?cand:i+1+0.99); }
      case '90':{ const i=Math.floor(valor), cand=i+0.90; return cents(cand>=valor?cand:i+1+0.90); }
      case '0.50': return cents(ceilTo(valor,0.50));
      default: return cents(valor);
    }
  }

  function calcular(){
    calcCFPct(); calcDNAPct();

    const cmv = Number($('#pv_cmv')?.value||0);
    const dna = Number($('#pv_dnaPct')?.value||0)/100;
    const lucro = Number($('#pv_lucroPct')?.value||0)/100;

    const ifood = Number($('#pv_ifoodPct')?.value||0)/100;
    const entIF = Number($('#pv_entregaIFR')?.value||0);
    const ciIF  = Number($('#pv_ciIFR')?.value||0);

    const nfood = Number($('#pv_nfoodPct')?.value||0)/100;
    const ent99 = Number($('#pv_entrega99R')?.value||0);

    const denom = 1 - dna - lucro;
    const pvLoja = (cmv>0 && denom>0) ? (cmv/denom) : NaN;

    const pvIFood    = isFinite(pvLoja) && (1-ifood)>0 ? ((pvLoja + entIF)       / (1 - ifood)) : NaN;
    const pvIFoodCI  = isFinite(pvLoja) && (1-ifood)>0 ? ((pvLoja + entIF + ciIF)/ (1 - ifood)) : NaN;
    const pv99Food   = isFinite(pvLoja) && (1-nfood)>0 ? ((pvLoja + ent99)       / (1 - nfood)) : NaN;

    const regra = $('#pv_roundRule')?.value || 'none';
    const r1 = ceilRule(pvLoja,   regra);
    const r2 = ceilRule(pvIFood,  regra);
    const r3 = ceilRule(pvIFoodCI,regra);
    const r4 = ceilRule(pv99Food, regra);

    // KPIs (preenche os cards da coluna direita)
document.getElementById('kpi_cmv').textContent     = money(cmv);
document.getElementById('kpi_dna').textContent     = pct(dna*100);
document.getElementById('kpi_lucro').textContent   = pct(lucro*100);
document.getElementById('kpi_pvloja').textContent  = money(r1);
document.getElementById('kpi_ifood').textContent   = money(r2);
document.getElementById('kpi_ifoodci').textContent = money(r3);
document.getElementById('kpi_99').textContent      = money(r4);
    const loja=getLoja(); const fId=$('#pv_ficha')?.value;
    const ficha=(loja?.fichas||[]).find(x=>x.id===fId);
    const tbody=$('#pv_tbody'); if(!tbody) return;
    tbody.innerHTML='';
    const tr=document.createElement('tr');
    const cols=[
      (ficha?.nome||ficha?.id||'—'),
      money(cmv),
      `${pct(dna*100)} + ${pct(lucro*100)}`,
      money(r1), money(r2), money(r3), money(r4)
    ];
    cols.forEach((v,i)=>{ const td=document.createElement('td'); td.textContent=v; if(i>0) td.className='right'; tr.appendChild(td); });
    tbody.appendChild(tr);
  }

  function salvarPrefs(){
    const loja=getLoja(); if(!loja) return;
    loja.variaveis = loja.variaveis || {};
    loja.variaveis.prefs = loja.variaveis.prefs || {};
    loja.variaveis.prefs.regraArred = $('#pv_roundRule')?.value || 'none';
    loja.variaveis.prefs.margemAlvoPercent = Number($('#pv_lucroPct')?.value||0);
    loja.variaveis.taxaMarketplacePercent = Number($('#pv_ifoodPct')?.value||0);
    loja.variaveis.entregaReais = Number($('#pv_entregaIFR')?.value||0);
    loja.variaveis.ciReais = Number($('#pv_ciIFR')?.value||0);
    loja.variaveis.taxa99Percent = Number($('#pv_nfoodPct')?.value||0);
    loja.variaveis.entrega99Reais = Number($('#pv_entrega99R')?.value||0);
    saveState(app); setStatus('Preferências salvas para a loja.');
  }

  function impCF(){
    const loja=getLoja(); if(!loja) return; loja.dna=loja.dna||[];
    const rows=parseCSV($('#pv_csvCF')?.value||'');
    rows.forEach(r=>{
      const ano=Number(r[0]), mes=Number(r[1]), total=Number(r[2]);
      if(!ano||!mes) return;
      const i = loja.dna.findIndex(d=>d.ano===ano && d.mes===mes);
      const obj={ano,mes,totalFixosMes:total};
      if(i>=0) loja.dna[i]=obj; else loja.dna.push(obj);
    });
    saveState(app); setStatus('Custo Fixo importado.'); puxarMes();
  }
  function impFat(){
    const loja=getLoja(); if(!loja) return; loja.faturamento=loja.faturamento||[];
    const rows=parseCSV($('#pv_csvFat')?.value||'');
    rows.forEach(r=>{
      const ano=Number(r[0]), mes=Number(r[1]), fat=Number(r[2]);
      if(!ano||!mes) return;
      const i = loja.faturamento.findIndex(x=>x.ano===ano && x.mes===mes);
      const obj={ano,mes,faturamento:fat};
      if(i>=0) loja.faturamento[i]=obj; else loja.faturamento.push(obj);
    });
    saveState(app); setStatus('Faturamento importado.'); puxarMes();
  }

  function bindEvents(){
    $('#pv_ficha')?.addEventListener('change', updateCMV);
    ['pv_fatMes','pv_cfMes'].forEach(id=>$('#'+id)?.addEventListener('input', calcCFPct));
    ['pv_cartoesPct','pv_voucherPct','pv_impostoPct','pv_royaltyPct','pv_mktPct'].forEach(id=>$('#'+id)?.addEventListener('input', calcDNAPct));
    ['pv_porcoesMes','pv_dnaReaisMes'].forEach(id=>$('#'+id)?.addEventListener('input', calcRateio));
    $('#pv_btnCalc')?.addEventListener('click', calcular);
    $('#pv_btnPuxarMes')?.addEventListener('click', puxarMes);
    $('#pv_btnSalvarPrefs')?.addEventListener('click', salvarPrefs);
    $('#pv_btnImpCF')?.addEventListener('click', impCF);
    $('#pv_btnImpFat')?.addEventListener('click', impFat);
  }

  function initIfPresent(){
    if (!document.getElementById('pv')) return;
    const now=new Date(); const pad=n=>n<10?'0'+n:n;
    $('#pv_mesano').value = now.getFullYear()+'-'+pad(now.getMonth()+1);

    initLojaSelect();
    initFichaSelect();
    calcDNAPct();
    bindEvents();
    console.log('[PV] módulo inicializado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIfPresent);
  } else {
    initIfPresent();
  }
})();
/* === PV KPI SYNC (ADDON) === */
/* Atualiza os quadrinhos de resumo com base nos resultados do cálculo */

function atualizarKPIs(resultados) {
  // resultados: objeto retornado por calcular(), com as chaves esperadas
  const kpiMap = {
    kpi_cmv: resultados.cmv,
    kpi_dna: resultados.dna,
    kpi_lucro: resultados.lucro,
    kpi_pvloja: resultados.pvLoja,
    kpi_ifood: resultados.pvIFood,
    kpi_ifoodci: resultados.pvIFoodCI,
    kpi_99: resultados.pv99,
  };

  for (const [id, valor] of Object.entries(kpiMap)) {
    const el = document.getElementById(id);
    if (!el) continue;

    if (typeof valor === "number") {
      if (id === "kpi_dna" || id === "kpi_lucro") {
        el.textContent = valor.toFixed(2) + "%";
      } else {
        el.textContent = "R$ " + valor.toFixed(2).replace(".", ",");
      }
    } else {
      el.textContent = "--";
    }
  }
}

/* Exemplo de uso: dentro da função calcular() existente,
   após obter r1..r4 (resultados finais), adicione esta linha:

   atualizarKPIs({
     cmv: cmv,
     dna: dnaPct * 100,
     lucro: lucroPct * 100,
     pvLoja: pvLoja,
     pvIFood: pvIFood,
     pvIFoodCI: pvIFoodCI,
     pv99: pv99
   });

   (isso deve ficar logo antes de montar a tabela no PV MODULE)
*/
/* === PV UX (ADDON) === */
/* Melhora a experiência visual e adiciona pequenos feedbacks */

function pvNotificar(msg, tipo = "success") {
  const div = document.createElement("div");
  div.className = `pv-notif ${tipo}`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

/* Ligação do botão Calcular PV */
const btnCalc = document.getElementById("pv_btnCalc");
if (btnCalc) {
  btnCalc.addEventListener("click", () => {
    try {
      if (typeof calcular === "function") {
        calcular(); // chama sua função original
        pvNotificar("Cálculo concluído com sucesso!", "success");
      } else {
        pvNotificar("Função de cálculo não encontrada!", "error");
      }
    } catch (e) {
      console.error(e);
      pvNotificar("Erro ao calcular!", "error");
    }
  });
}

/* Tooltips automáticas */
document.querySelectorAll("label").forEach(lbl => {
  lbl.addEventListener("mouseenter", e => {
    const texto = lbl.textContent.trim();
    if (!texto) return;
    const tip = document.createElement("div");
    tip.textContent = texto;
    tip.className = "pv-notif success";
    tip.style.position = "fixed";
    tip.style.left = e.pageX + "px";
    tip.style.top = e.pageY - 35 + "px";
    tip.style.fontSize = "11px";
    tip.style.padding = "4px 8px";
    tip.style.background = "#111827";
    tip.style.color = "#fff";
    tip.style.opacity = "0.9";
    tip.style.borderRadius = "6px";
    tip.style.pointerEvents = "none";
    document.body.appendChild(tip);
    lbl.addEventListener("mouseleave", () => tip.remove(), { once: true });
  });
});

/* Copiar PV Loja */
const kpiLoja = document.getElementById("kpi_pvloja");
if (kpiLoja) {
  kpiLoja.style.cursor = "pointer";
  kpiLoja.title = "Clique para copiar o PV Loja";
  kpiLoja.addEventListener("click", () => {
    const valor = kpiLoja.textContent.trim();
    if (valor && valor !== "--") {
      navigator.clipboard.writeText(valor);
      pvNotificar("PV Loja copiado!", "success");
    }
  });
}

/* Diagnóstico simples */
function pvDiagnostico() {
  const chaves = Object.keys(localStorage);
  const maiores = chaves.sort(
    (a, b) => (localStorage[b]?.length || 0) - (localStorage[a]?.length || 0)
  );
  const chaveUsada =
    localStorage.precificacaoState ||
    localStorage.carreiroState ||
    localStorage.pricingState ||
    localStorage[maiores[0]];

  const info = [
    "Diagnóstico PV",
    "---------------------------",
    "Chave detectada:",
    maiores[0] || "Nenhuma",
    "Tamanho do estado:",
    (localStorage[maiores[0]]?.length || 0) + " caracteres",
    "Data:",
    new Date().toLocaleString("pt-BR"),
  ].join("\n");

  alert(info);
}

/* Botão Diagnóstico extra */
const diagBtn = document.createElement("button");
diagBtn.textContent = "Diagnóstico";
diagBtn.className = "pv-btn w-full mt-2";
diagBtn.onclick = pvDiagnostico;
document
  .querySelector(".pv-left .pv-card:last-child")
  ?.appendChild(diagBtn);
/* === PV UI Toggle (ADDON) === */
const toggleBtn = document.getElementById("pv_toggleCompact");
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("compacto");
    const ativo = document.body.classList.contains("compacto");
    toggleBtn.textContent = ativo ? "Modo Detalhado" : "Modo Compacto";
    pvNotificar(ativo ? "Modo compacto ativado" : "Modo detalhado ativado");
  });
}

/* Transição suave nas abas */
document.querySelectorAll(".tab-panel").forEach(sec=>{
  sec.style.transition = "opacity 0.25s ease";
});
/* === CDL THEME FIXER === */
(function applyCdlTheme(){
  try{
    document.documentElement.style.setProperty('--pv-primary', getComputedStyle(document.documentElement).getPropertyValue('--cdl-primary') || '#153869');
    document.documentElement.style.setProperty('--pv-primary-600', getComputedStyle(document.documentElement).getPropertyValue('--cdl-primary-600') || '#0b2540');
    // Forçar cor do header buttons caso estejam sobrescritos
    document.querySelectorAll('header button, .app-header button, .pv-header .pv-btn').forEach(b=>{
      b.style.background = '#fff';
      b.style.color = 'var(--pv-primary-600)';
    });
  }catch(e){ console.warn('CDL theme apply error', e); }
})();
 /* ================= PV MODULE (END) ================= */
/* =============== FATURAMENTO MODULE (START) =============== */
(function FaturamentoModule(){
  const KEYS = { state: ['precificacaoState','carreiroState','pricingState'], ctx:'pv_context' };
  const $ = s => document.querySelector(s);
  const money = v => isFinite(v)? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '—';
  const setText = (id, val) => { const el=document.getElementById(id); if(el) el.textContent = val; };

  // ---- Estado (independente do PV) ----
  function loadState(){
    for(const k of KEYS.state){
      const raw = localStorage.getItem(k);
      if(raw){ try{ const o=JSON.parse(raw); o.__key=k; return o; }catch(e){} }
    }
    // fallback: maior JSON do localStorage
    let best=null, bestK=null;
    for(const k of Object.keys(localStorage)){
      const raw=localStorage.getItem(k)||'';
      if(raw.startsWith('{') && raw.length>(best?.length||0)){ best=raw; bestK=k; }
    }
    if(best){ try{ const o=JSON.parse(best); o.__key=bestK; return o; }catch(e){} }
    return { lojas:[], __key: KEYS.state[0] };
  }
  function saveState(app){ const k=app?.__key||KEYS.state[0]; const c={...app}; delete c.__key; localStorage.setItem(k, JSON.stringify(c)); }
  function getLoja(app){
    const sel=$('#fat_loja'); const id=sel?.value;
    return (app.lojas||[]).find(l=>l.id===id) || (app.lojas||[])[0];
  }
  const ymKey = (a,m)=> a*12 + (m-1);
  function parseMonth(inp){ if(!inp?.value) return null; const [y,m]=inp.value.split('-').map(n=>parseInt(n,10)); return {ano:y,mes:m}; }
  function toMonthStr(a,m){ return String(a).padStart(4,'0')+'-'+String(m).padStart(2,'0'); }

  let app = loadState();

  // ---- UI init ----
  function initLojaSelect(){
    const sel=$('#fat_loja'); if(!sel) return;
    sel.innerHTML='';
    (app.lojas||[]).forEach(l=>{ const o=document.createElement('option'); o.value=l.id; o.textContent=l.nome||l.id; sel.appendChild(o); });
    // tenta manter mesma loja do PV
    try{
      const ctx=JSON.parse(localStorage.getItem(KEYS.ctx)||'{}');
      if(ctx?.lojaId && (app.lojas||[]).some(l=>l.id===ctx.lojaId)) sel.value = ctx.lojaId;
    }catch(e){}
    sel.addEventListener('change', ()=>{ renderTudo(); });
  }

  // ---- CRUD ----
  function listFat(loja){
    const arr = (loja?.faturamento || []).map(x=>({ano:Number(x.ano),mes:Number(x.mes),faturamento:Number(x.faturamento)}));
    // ordenar (mais recente primeiro)
    arr.sort((a,b)=> ymKey(b.ano,b.mes)-ymKey(a.ano,a.mes));
    return arr;
  }
  function upsertFat(loja, ano, mes, valor){
    loja.faturamento = loja.faturamento || [];
    const i = loja.faturamento.findIndex(x=>Number(x.ano)===ano && Number(x.mes)===mes);
    const obj={ano,mes,faturamento:valor};
    if(i>=0) loja.faturamento[i]=obj; else loja.faturamento.push(obj);
    saveState(app);
  }
  function deleteFat(loja, ano, mes){
    if(!loja?.faturamento) return;
    const i = loja.faturamento.findIndex(x=>Number(x.ano)===ano && Number(x.mes)===mes);
    if(i>=0){ loja.faturamento.splice(i,1); saveState(app); }
  }

  // ---- KPIs 12 meses ----
  function calc12(loja){
    const arr = listFat(loja);
    if(arr.length===0) return { soma:0, media:0, mesSel:0 };
    // pega os 12 mais recentes
    const ult12 = arr.slice(0,12);
    const soma = ult12.reduce((s,x)=> s + Number(x.faturamento||0), 0);
    const media = soma / ult12.length;
    return { soma, media };
  }

  // ---- Renderizações ----
  function renderKPIs(loja){
    const { soma, media } = calc12(loja);
    setText('fat_kpi_bruto12', money(soma));
    setText('fat_kpi_media12', money(media));

    // mês selecionado (contexto)
    const mm = parseMonth($('#fat_mesano'));
    let val = 0;
    if(mm && loja?.faturamento){
      const f = loja.faturamento.find(x=>Number(x.ano)===mm.ano && Number(x.mes)===mm.mes);
      val = Number(f?.faturamento || 0);
    }
    setText('fat_kpi_mesSel', money(val));
    const inpMesVal=$('#fat_valorMes'); if(inpMesVal) inpMesVal.value = val || '';
  }

  function renderTabela(loja){
    const tbody = $('#fat_tbody'); if(!tbody) return;
    const arr = listFat(loja);
    tbody.innerHTML='';
    for(const x of arr){
      const tr=document.createElement('tr');
      const tdMes=document.createElement('td');
      tdMes.textContent = toMonthStr(x.ano,x.mes);
      const tdVal=document.createElement('td'); tdVal.className='right'; tdVal.textContent = money(x.faturamento);
      const tdAcs=document.createElement('td'); tdAcs.className='right';
      const btnE=document.createElement('button'); btnE.className='btn'; btnE.textContent='Editar';
      btnE.addEventListener('click',()=>{
        $('#fat_mesedit').value = toMonthStr(x.ano,x.mes);
        $('#fat_valoredit').value = x.faturamento;
        $('#fat_btnExcluir').disabled = false;
        setStatus('Registro carregado para edição.');
      });
      const btnD=document.createElement('button'); btnD.className='btn'; btnD.textContent='Excluir';
      btnD.addEventListener('click',()=>{
        if(confirm('Confirma excluir '+toMonthStr(x.ano,x.mes)+'?')){
          deleteFat(loja, x.ano, x.mes);
          setStatus('Registro excluído.');
          renderTudo();
        }
      });
      tdAcs.appendChild(btnE);
      tdAcs.appendChild(document.createTextNode(' '));
      tdAcs.appendChild(btnD);

      tr.appendChild(tdMes); tr.appendChild(tdVal); tr.appendChild(tdAcs);
      tbody.appendChild(tr);
    }
  }

  function setStatus(t){
    const el=$('#fat_status'); if(!el) return;
    el.textContent = t||''; if(!t) return;
    setTimeout(()=>{ try{ el.textContent=''; }catch(e){} }, 3000);
  }

  // ---- Import/Export ----
  function importCSV(loja){
    const txt = $('#fat_csv')?.value || '';
    const rows = txt.trim().split(/\r?\n/).filter(Boolean).map(l=>l.split(',').map(s=>s.trim()));
    let n=0;
    for(const r of rows){
      const ano=Number(r[0]), mes=Number(r[1]), val=Number(r[2]);
      if(ano && mes && isFinite(val)){ upsertFat(loja, ano, mes, val); n++; }
    }
    setStatus(`Importado(s) ${n} registro(s).`);
    renderTudo();
  }
  function exportCSV(loja){
    const arr=listFat(loja).map(x=>`${x.ano},${x.mes},${x.faturamento}`);
    const blob = new Blob([arr.join('\n')], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='faturamento.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Eventos ----
  function bindEvents(){
    $('#fat_loja')?.addEventListener('change', ()=>renderTudo());
    $('#fat_mesano')?.addEventListener('change', ()=>renderKPIs(getLoja(app)));

    $('#fat_btnSalvar')?.addEventListener('click', ()=>{
      const loja=getLoja(app); if(!loja) return;
      const mm = parseMonth($('#fat_mesedit'));
      const val = Number($('#fat_valoredit')?.value||0);
      if(!mm || !isFinite(val)){ setStatus('Preencha mês/ano e um valor numérico.'); return; }
      upsertFat(loja, mm.ano, mm.mes, val);
      setStatus('Faturamento salvo.');
      $('#fat_btnExcluir').disabled = false;
      renderTudo();
    });

    $('#fat_btnNovo')?.addEventListener('click', ()=>{
      $('#fat_mesedit').value=''; $('#fat_valoredit').value='';
      $('#fat_btnExcluir').disabled = true;
      setStatus('');
    });

    $('#fat_btnExcluir')?.addEventListener('click', ()=>{
      const loja=getLoja(app); if(!loja) return;
      const mm = parseMonth($('#fat_mesedit')); if(!mm){ setStatus('Selecione um mês para excluir.'); return; }
      if(confirm('Confirma exclusão?')){
        deleteFat(loja, mm.ano, mm.mes);
        setStatus('Faturamento excluído.');
        $('#fat_btnExcluir').disabled = true;
        renderTudo();
      }
    });

    $('#fat_btnImp')?.addEventListener('click', ()=>{
      const loja=getLoja(app); if(loja) importCSV(loja);
    });
    $('#fat_btnExp')?.addEventListener('click', ()=>{
      const loja=getLoja(app); if(loja) exportCSV(loja);
    });
  }

  // ---- Render pipeline ----
  function renderTudo(){
    const loja=getLoja(app); if(!loja) return;
    renderKPIs(loja);
    renderTabela(loja);
  }

  function initIfPresent(){
    if(!document.getElementById('faturamento')) return;
    initLojaSelect();
    // mês atual default
    const now=new Date(); const pad=n=>n<10?'0'+n:n;
    const elMes=$('#fat_mesano'); if(elMes) elMes.value = now.getFullYear()+'-'+pad(now.getMonth()+1);
    bindEvents();
    renderTudo();
    console.log('[FATURAMENTO] módulo inicializado');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', initIfPresent);
  }else{
    initIfPresent();
  }
})();
 /* =============== FATURAMENTO MODULE (END) =============== */
/* === CDL: toggle visual de abas (adic. .active) - opcional === */
(function(){
  try{
    const selectors = ['.tab-bar button','.tab-bar a','.tabs button','.tabs a'];
    const elems = Array.from(document.querySelectorAll(selectors.join(',')));
    if(!elems.length) return;

    elems.forEach(el=>{
      el.addEventListener('click', (e)=>{
        // Remove .active de todos do mesmo container
        const parent = el.closest('.tab-bar') || el.closest('.tabs') || document;
        const group = parent.querySelectorAll('button, a');
        group.forEach(g => g.classList.remove('active'));

        // Marca o clicado
        el.classList.add('active');
      });
    });
  }catch(err){
    console.warn('CDL toggle tabs error', err);
  }
})();
/* === CDL: Toggle de menu mobile === */
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('menuToggle');
  if (sidebar && toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
});
/* === CDL: Dashboard gráfico e KPIs === */
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("dash_chart");
  if (!ctx) return;

  // Gráfico simples (usando Chart.js)
  // Adiciona Chart.js dinamicamente
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/chart.js";
  script.onload = () => {
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jun", "Jul", "Ago", "Set", "Out"],
        datasets: [{
          label: "Faturamento (R$)",
          data: [9300, 10400, 11800, 12600, 12450],
          borderColor: "#2563eb",
          tension: 0.3,
          fill: false
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  };
  document.body.appendChild(script);
});
// ===================================================
// BLOCO L — Troca de abas (menu superior)
// ===================================================
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(section => section.classList.remove('active'));

    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});
