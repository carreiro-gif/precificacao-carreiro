let lojas = JSON.parse(localStorage.getItem('lojas')) || [];
let lojaAtual = null;

function salvarLojas() {
  localStorage.setItem('lojas', JSON.stringify(lojas));
}

function listarLojas() {
  const container = document.getElementById('lista-lojas');
  container.innerHTML = '';
  lojas.forEach((loja, index) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <span>${loja.nome}</span>
      <button onclick="abrirLoja(${index})">Abrir</button>
      <button onclick="duplicarLoja(${index})">Duplicar</button>
    `;
    container.appendChild(div);
  });
}
listarLojas();

function novaLoja() {
  const nome = prompt('Nome da nova loja:');
  if (nome) {
    lojas.push({ nome, logo: '', faturamento: [], insumos: [] });
    salvarLojas();
    listarLojas();
  }
}

function duplicarLoja(index) {
  const copia = JSON.parse(JSON.stringify(lojas[index]));
  copia.nome += ' (Cópia)';
  lojas.push(copia);
  salvarLojas();
  listarLojas();
}

function abrirLoja(index) {
  lojaAtual = index;
  document.getElementById('lojas').classList.remove('active');
  document.getElementById('painel-loja').classList.add('active');
  document.getElementById('nome-loja').textContent = lojas[index].nome;
  document.getElementById('editar-nome').value = lojas[index].nome;
  document.getElementById('logo-loja').src = lojas[index].logo || '';
}

function voltar() {
  document.getElementById('painel-loja').classList.remove('active');
  document.getElementById('lojas').classList.add('active');
}

function salvarNome() {
  lojas[lojaAtual].nome = document.getElementById('editar-nome').value;
  salvarLojas();
  document.getElementById('nome-loja').textContent = lojas[lojaAtual].nome;
  listarLojas();
}

function alterarLogo() {
  const file = document.getElementById('upload-logo').files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      lojas[lojaAtual].logo = e.target.result;
      salvarLojas();
      document.getElementById('logo-loja').src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function showSection(id) {
  document.querySelectorAll('.aba').forEach(sec => sec.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
