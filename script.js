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
 /* ================= PV MODULE (END) ================= */
