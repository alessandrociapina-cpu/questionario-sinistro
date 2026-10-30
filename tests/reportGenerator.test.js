/**
 * @jest-environment jsdom
 */
'use strict';

const { esc, DEPARTAMENTO_PADRAO } = require('../utils');

global.esc = esc;
global.DEPARTAMENTO_PADRAO = DEPARTAMENTO_PADRAO;
global.Editor = {
  estaVazio: jest.fn(() => true),
  getHTML: jest.fn(() => ''),
};
Element.prototype.scrollIntoView = jest.fn();

const { ReportGenerator } = require('../reportGenerator');

function montarDOM() {
  document.body.innerHTML = `
    <div class="header"><h1>Questionário</h1></div>
    <form id="questionarioForm">
      <input type="text" id="endereco" />
      <input type="text" id="diametro" />
      <input type="checkbox" id="obras_outras_check" />
      <textarea id="obras_outras_text" class="hidden-field campo-outras" rows="1"></textarea>
      <input type="checkbox" id="relatorio_foto_nao_check" />
      <textarea id="justificativa_foto" class="hidden-field"></textarea>
      <fieldset id="responsavelFieldset">
        <input type="text" id="responsavel_nome" />
        <select id="responsavel_cargo"><option value="Sem cargo">Sem cargo</option></select>
      </fieldset>
    </form>
    <div id="reportOutput"></div>
  `;
}

function relatorio() {
  return document.querySelector('#reportOutput .report-view');
}

beforeEach(montarDOM);

describe('ReportGenerator.gerar()', () => {
  // Regressão: inputs não quebram linha na impressão e cortavam o texto dos campos "Outras".
  test('troca campos de texto preenchidos por texto comum, que quebra linha', () => {
    const longo = 'Escavação de terceiros na calçada, rompendo o ramal predial durante a obra';
    document.getElementById('obras_outras_check').checked = true;
    document.getElementById('obras_outras_text').value = longo;
    document.getElementById('endereco').value = 'Rua A, 100';

    ReportGenerator.gerar();

    const valores = relatorio().querySelectorAll('.report-valor');
    expect([...valores].map((v) => v.textContent)).toEqual(['Rua A, 100', longo]);
    expect(valores[1].tagName).toBe('SPAN');
    expect(valores[1].classList.contains('campo-outras')).toBe(true);
    expect(relatorio().querySelector('textarea.campo-outras')).toBeNull();
  });

  test('mantém o texto digitado como texto puro, sem interpretar HTML', () => {
    document.getElementById('endereco').value = '<img src=x onerror=alert(1)>';

    ReportGenerator.gerar();

    const valor = relatorio().querySelector('.report-valor');
    expect(valor.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(relatorio().querySelector('img')).toBeNull();
  });

  test('deixa campos vazios como estão', () => {
    ReportGenerator.gerar();
    expect(relatorio().querySelectorAll('input[type="text"]').length).toBe(2);
    expect(relatorio().querySelector('.report-valor')).toBeNull();
  });

  test('justificativa do relatório fotográfico preenchida também vira texto', () => {
    document.getElementById('relatorio_foto_nao_check').checked = true;
    document.getElementById('justificativa_foto').value = 'Sem acesso ao imóvel';

    ReportGenerator.gerar();

    expect(relatorio().querySelector('.report-valor').textContent).toBe('Sem acesso ao imóvel');
  });

  test('não deixa ids duplicados no documento', () => {
    document.getElementById('endereco').value = 'Rua A, 100';
    ReportGenerator.gerar();
    expect(relatorio().querySelectorAll('[id]').length).toBe(0);
  });
});
