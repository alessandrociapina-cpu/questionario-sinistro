/* global Quill */
'use strict';

/**
 * Editor de texto rico do campo "10 - Observações/Considerações".
 *
 * Decisões de projeto importantes:
 *
 * 1. Formatos por ESTILO, não por classe. Quill oferece atributos em classe
 *    (`ql-font-arial`) e em estilo (`font-family: Arial`). Usamos estilo para
 *    que o HTML gerado seja autossuficiente e sobreviva ao relatório/impressão
 *    sem depender do CSS do Quill.
 *
 * 2. O estado é persistido como Delta (JSON estruturado), nunca como HTML.
 *    Assim um arquivo .json adulterado não consegue injetar marcação no
 *    relatório — o Quill só renderiza formatos que conhece.
 */

const Editor = (() => {
  const FONTES = ['Arial', 'Calibri', 'Courier New', 'Georgia', 'Tahoma', 'Times New Roman', 'Verdana'];

  const TAMANHOS = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '36pt'];

  let _quill = null;

  function _registrarFormatos() {
    const Parchment = Quill.import('parchment');

    // O Chrome devolve font-family entre aspas ("Times New Roman"), o que
    // quebraria a comparação com a whitelist e faria o item do menu nunca
    // aparecer como selecionado. Normalizamos na leitura.
    class FontFamilyAttributor extends Parchment.StyleAttributor {
      value(node) {
        return super.value(node).replace(/["']/g, '');
      }
    }

    const FontStyle = new FontFamilyAttributor('font', 'font-family', {
      scope: Parchment.Scope.INLINE,
      whitelist: FONTES,
    });
    Quill.register(FontStyle, true);

    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = TAMANHOS;
    Quill.register(SizeStyle, true);

    Quill.register(Quill.import('attributors/style/align'), true);
    Quill.register(Quill.import('attributors/style/color'), true);
    Quill.register(Quill.import('attributors/style/background'), true);

    // Linha horizontal (<hr>) — o Quill não traz esse formato de fábrica.
    const BlockEmbed = Quill.import('blots/block/embed');
    class DividerBlot extends BlockEmbed {}
    DividerBlot.blotName = 'divider';
    DividerBlot.tagName = 'hr';
    Quill.register(DividerBlot);

    const icons = Quill.import('ui/icons');
    icons.divider = '<span style="font-weight:bold;font-size:13px;">—</span>';
  }

  function _inserirLinha() {
    const range = _quill.getSelection(true);
    _quill.insertText(range.index, '\n', Quill.sources.USER);
    _quill.insertEmbed(range.index + 1, 'divider', true, Quill.sources.USER);
    _quill.setSelection(range.index + 2, Quill.sources.SILENT);
  }

  function _cursorEmTabela() {
    const range = _quill.getSelection();
    if (!range) return false;
    const [linha] = _quill.getLine(range.index);
    if (!linha || !linha.domNode || !linha.domNode.closest) return false;
    return !!linha.domNode.closest('td');
  }

  function _acaoTabela(valor, aoFalhar) {
    if (!valor) return;

    const tabela = _quill.getModule('table');
    const acoes = {
      inserir: () => tabela.insertTable(3, 3),
      'linha-acima': () => tabela.insertRowAbove(),
      'linha-abaixo': () => tabela.insertRowBelow(),
      'coluna-esquerda': () => tabela.insertColumnLeft(),
      'coluna-direita': () => tabela.insertColumnRight(),
      'excluir-linha': () => tabela.deleteRow(),
      'excluir-coluna': () => tabela.deleteColumn(),
      'excluir-tabela': () => tabela.deleteTable(),
    };

    const acao = acoes[valor];
    if (!acao) return;

    _quill.focus();

    if (valor === 'inserir') {
      acao();
      return;
    }

    // Fora de uma tabela o Quill não lança erro: ele simplesmente não faz nada.
    // Sem esta checagem o clique viraria um silêncio inexplicável para o usuário.
    if (!_cursorEmTabela()) {
      if (aoFalhar) aoFalhar('Coloque o cursor dentro de uma tabela para usar esta opção.');
      return;
    }

    try {
      acao();
    } catch (e) {
      console.error('Falha na ação de tabela:', e);
      if (aoFalhar) aoFalhar('Não foi possível alterar a tabela.');
    }
  }

  function init(seletorEditor, seletorToolbar, aoMudar, aoFalhar) {
    _registrarFormatos();

    _quill = new Quill(seletorEditor, {
      theme: 'snow',
      placeholder: 'Digite aqui as observações, considerações e a conclusão final.',
      modules: {
        table: true,
        toolbar: {
          container: seletorToolbar,
          handlers: {
            divider: _inserirLinha,
            tabela: function (valor) {
              _acaoTabela(valor, aoFalhar);
              // Volta o select ao rótulo neutro; ele é um menu de ações,
              // não um formato com estado.
              const picker = document.querySelector('.ql-tabela .ql-picker-label');
              if (picker) picker.classList.remove('ql-active');
              this.quill.focus();
            },
          },
        },
      },
    });

    if (aoMudar) {
      _quill.on('text-change', (_delta, _old, source) => {
        if (source === 'user') aoMudar();
      });
    }

    return _quill;
  }

  function getDelta() {
    return _quill ? _quill.getContents() : null;
  }

  function setDelta(delta) {
    if (!_quill) return;
    if (delta && Array.isArray(delta.ops)) {
      _quill.setContents(delta, Quill.sources.SILENT);
    } else {
      _quill.setText('', Quill.sources.SILENT);
    }
  }

  function getHTML() {
    return _quill ? _quill.root.innerHTML : '';
  }

  function estaVazio() {
    if (!_quill) return true;
    const semTexto = _quill.getText().trim() === '';
    const semEmbeds = !_quill.root.querySelector('table, hr, img');
    return semTexto && semEmbeds;
  }

  return { init, getDelta, setDelta, getHTML, estaVazio, FONTES, TAMANHOS };
})();

/* global module */
if (typeof module !== 'undefined') module.exports = { Editor };
