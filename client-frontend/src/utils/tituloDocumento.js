// O título da aba tem duas fontes independentes: a página atual e o número de
// notificações não lidas. Guardar as duas aqui evita que uma sobrescreva a outra.
let titulo = null;
let naoLidas = 0;

function aplicar() {
  const base = titulo ? `${titulo} · Levit` : 'Levit';
  document.title = naoLidas > 0 ? `(${naoLidas > 99 ? '99+' : naoLidas}) ${base}` : base;
}

export function definirTituloDaPagina(novo) {
  titulo = novo;
  aplicar();
}

export function definirNaoLidasNoTitulo(quantidade) {
  naoLidas = quantidade;
  aplicar();
}
