'use strict';

function mostrarAlerta(msg, tipo) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-app');
    document.getElementById('modal-mensagem').textContent = msg;
    document.getElementById('modal-btn-cancelar').style.display = 'none';
    overlay.dataset.tipo = tipo || 'info';
    overlay.style.display = 'flex';

    function fechar() {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', onKey);
      resolve();
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter') fechar();
    }

    document.getElementById('modal-btn-ok').onclick = fechar;
    document.addEventListener('keydown', onKey);
    document.getElementById('modal-btn-ok').focus();
  });
}

function confirmar(msg) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-app');
    document.getElementById('modal-mensagem').textContent = msg;
    const btnCancelar = document.getElementById('modal-btn-cancelar');
    btnCancelar.style.display = 'inline-block';
    overlay.dataset.tipo = 'confirm';
    overlay.style.display = 'flex';

    function fecharCom(resultado) {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', onKey);
      resolve(resultado);
    }

    function onKey(e) {
      if (e.key === 'Enter') fecharCom(true);
      if (e.key === 'Escape') fecharCom(false);
    }

    document.getElementById('modal-btn-ok').onclick = () => fecharCom(true);
    btnCancelar.onclick = () => fecharCom(false);
    document.addEventListener('keydown', onKey);
    btnCancelar.focus();
  });
}

/* global module */
if (typeof module !== 'undefined') {
  module.exports = { mostrarAlerta, confirmar };
}
