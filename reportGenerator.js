/* global Editor, esc, DEPARTAMENTO_PADRAO */
'use strict';

const ReportGenerator = (() => {
  function _botaoImprimir() {
    const btn = document.createElement('button');
    btn.textContent = 'Imprimir (Salvar como PDF)';
    btn.className = 'print-btn';
    btn.onclick = () => window.print();
    return btn;
  }

  function _dicaImpressao() {
    const p = document.createElement('p');
    p.className = 'print-message';
    p.innerHTML =
      '<strong>Dica:</strong> Na janela de impressão que será aberta, selecione o destino ' +
      '"<strong>Guardar como PDF</strong>" para obter o melhor resultado e evitar problemas de ' +
      'compatibilidade com a impressora virtual Cute PDF Writer.';
    return p;
  }

  /**
   * Troca o editor Quill pelo HTML já renderizado.
   *
   * O HTML vem do próprio renderizador do Quill (não de texto cru do usuário
   * nem do arquivo .json), e o Quill só emite formatos que conhece — é por isso
   * que `innerHTML` é seguro aqui. A classe `ql-editor` é mantida para que o
   * CSS do Quill continue desenhando listas e tabelas igual ao editor.
   */
  function _renderizarObservacoes(clonedForm) {
    const wrapper = clonedForm.querySelector('#observacoes-wrapper');
    if (!wrapper) return;

    const bloco = document.createElement('div');
    bloco.className = 'ql-editor report-rich-text';

    if (Editor.estaVazio()) {
      bloco.innerHTML = '<p class="report-vazio">Nenhuma observação foi adicionada.</p>';
    } else {
      bloco.innerHTML = Editor.getHTML();
    }

    wrapper.parentNode.replaceChild(bloco, wrapper);
  }

  function _placeholder(texto) {
    const span = document.createElement('span');
    span.className = 'report-placeholder';
    span.textContent = texto;
    return span;
  }

  function _copiarValores(formOriginal, clonedForm) {
    const originais = {};
    formOriginal.querySelectorAll('input, textarea, select').forEach((el) => {
      if (el.id) originais[el.id] = el;
    });

    clonedForm.querySelectorAll('input, textarea, select').forEach((clone) => {
      const original = originais[clone.id];
      if (!original) return;
      if (clone.closest('#responsavelFieldset')) return;

      // Datas e horas vazias viram lacunas para preencher à mão no papel.
      if (!original.value) {
        if (original.type === 'date') {
          clone.parentNode.replaceChild(_placeholder('__/__/____'), clone);
          return;
        }
        if (original.type === 'time') {
          clone.parentNode.replaceChild(_placeholder('__:__'), clone);
          return;
        }
      }

      if (original.type === 'checkbox' || original.type === 'radio') {
        clone.checked = original.checked;
      } else {
        clone.value = original.value;
      }
      clone.disabled = true;
    });
  }

  /**
   * Campo 09: só faz sentido mostrar a justificativa quando "Não" está marcado.
   * Marcado e em branco → mostra o aviso; desmarcado → some do relatório.
   */
  function _ajustarRelatorioFotografico(clonedForm) {
    const naoMarcado = document.getElementById('relatorio_foto_nao_check').checked;
    const justificativa = document.getElementById('justificativa_foto').value;
    const clone = clonedForm.querySelector('#justificativa_foto');
    if (!clone) return;

    if (!naoMarcado) {
      clone.remove();
      return;
    }

    if (!justificativa) {
      const aviso = document.createElement('span');
      aviso.className = 'report-placeholder-text';
      aviso.textContent = 'Justifique a ausência do relatório fotográfico.';
      clone.parentNode.replaceChild(aviso, clone);
    }
  }

  function _montarResponsavel(clonedForm) {
    const fieldset = clonedForm.querySelector('#responsavelFieldset');
    if (!fieldset) return;

    const nome = document.getElementById('responsavel_nome').value;
    const cargo = document.getElementById('responsavel_cargo').value;

    let html = '<div class="responsavel-report">';
    if (nome) html += `<p><strong>${esc(nome)}</strong></p>`;
    if (cargo !== 'Sem cargo') {
      html += `<p>${esc(cargo)} ${DEPARTAMENTO_PADRAO}</p>`;
    } else {
      html += `<p>${DEPARTAMENTO_PADRAO}</p>`;
    }
    html += '</div>';

    fieldset.innerHTML = `<legend>Responsável pela apuração</legend>${html}`;
  }

  /**
   * O clone carrega os mesmos ids do formulário real. Deixá-los no documento
   * faria o autosave (que seleciona por `#questionarioForm input`) enxergar os
   * campos desabilitados do relatório e gravar lixo no rascunho.
   */
  function _removerIds(raiz) {
    raiz.removeAttribute('id');
    raiz.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    raiz.querySelectorAll('[for]').forEach((el) => el.removeAttribute('for'));
  }

  function gerar() {
    const saida = document.getElementById('reportOutput');
    saida.innerHTML = '';
    saida.appendChild(_botaoImprimir());
    saida.appendChild(_dicaImpressao());

    const headerClone = document.querySelector('.header').cloneNode(true);
    const formOriginal = document.getElementById('questionarioForm');
    const clonedForm = formOriginal.cloneNode(true);

    _renderizarObservacoes(clonedForm);
    _copiarValores(formOriginal, clonedForm);
    _ajustarRelatorioFotografico(clonedForm);
    _montarResponsavel(clonedForm);
    _removerIds(clonedForm);

    clonedForm.classList.add('report-view');

    saida.appendChild(headerClone);
    saida.appendChild(clonedForm);

    saida.style.display = 'block';
    saida.scrollIntoView({ behavior: 'smooth' });
  }

  return { gerar };
})();

/* global module */
if (typeof module !== 'undefined') module.exports = { ReportGenerator };
