/**
 * @jest-environment jsdom
 */
'use strict';

// Globals de que o formHandler depende em tempo de execução
global.ESTADO_VERSAO = 1;
global.salvarDB = jest.fn(() => Promise.resolve());
global.carregarDB = jest.fn(() => Promise.resolve(null));
global.limparDB = jest.fn(() => Promise.resolve());
global.validarEsquemaProjeto = jest.fn(() => true);
global.nomeArquivoProjeto = jest.fn(() => 'projeto.json');
global.confirmar = jest.fn(() => Promise.resolve(false));
global.mostrarAlerta = jest.fn(() => Promise.resolve());
global.formatarDataISO = jest.fn((s) => s);
global.Editor = {
  getDelta: jest.fn(() => ({ ops: [{ insert: 'texto\n' }] })),
  setDelta: jest.fn(),
};

const { FormHandler } = require('../formHandler');

function montarDOM() {
  document.body.innerHTML = `
    <form id="questionarioForm">
      <input type="text" id="endereco" />
      <input type="checkbox" id="reclamacao_outras_check" />
      <input type="text" id="reclamacao_outras_text" class="hidden-field" />
      <input type="checkbox" id="relatorio_foto_nao_check" />
      <textarea id="justificativa_foto" class="hidden-field"></textarea>
      <input type="radio" name="danos_providencias" id="danos_normal_sem_remocao" value="normal_sem_remocao" />
      <input type="radio" name="danos_providencias" id="danos_emergencial_outras" value="emergencial_outras" />
      <textarea id="danos_emergencial_outras_text" class="hidden-field"></textarea>
      <select id="responsavel_cargo">
        <option value="Engenheiro">Engenheiro</option>
        <option value="ASA">ASA</option>
      </select>
    </form>
  `;
}

beforeEach(() => {
  montarDOM();
  jest.clearAllMocks();
});

describe('exportarEstado()', () => {
  test('captura texto, checkbox, select e o Delta do editor', () => {
    document.getElementById('endereco').value = 'Rua A, 100';
    document.getElementById('reclamacao_outras_check').checked = true;
    document.getElementById('responsavel_cargo').value = 'ASA';

    const estado = FormHandler.exportarEstado();

    expect(estado.versao).toBe(1);
    expect(estado.form.endereco).toBe('Rua A, 100');
    expect(estado.form.reclamacao_outras_check).toBe(true);
    expect(estado.form.responsavel_cargo).toBe('ASA');
    expect(estado.observacoes).toEqual({ ops: [{ insert: 'texto\n' }] });
    expect(typeof estado.salvoEm).toBe('string');
  });

  test('grava radios como booleanos por id', () => {
    document.getElementById('danos_emergencial_outras').checked = true;
    const estado = FormHandler.exportarEstado();
    expect(estado.form.danos_emergencial_outras).toBe(true);
    expect(estado.form.danos_normal_sem_remocao).toBe(false);
  });
});

describe('carregarEstado()', () => {
  test('restaura os valores do formulário', () => {
    FormHandler.carregarEstado({
      form: { endereco: 'Rua B', reclamacao_outras_check: true, responsavel_cargo: 'ASA' },
      observacoes: { ops: [] },
    });

    expect(document.getElementById('endereco').value).toBe('Rua B');
    expect(document.getElementById('reclamacao_outras_check').checked).toBe(true);
    expect(document.getElementById('responsavel_cargo').value).toBe('ASA');
  });

  test('repassa o Delta para o editor', () => {
    const delta = { ops: [{ insert: 'oi\n' }] };
    FormHandler.carregarEstado({ form: {}, observacoes: delta });
    expect(global.Editor.setDelta).toHaveBeenCalledWith(delta);
  });

  test('ignora campos que não existem mais no formulário', () => {
    expect(() => FormHandler.carregarEstado({ form: { campo_extinto: 'x' } })).not.toThrow();
  });

  // Regressão: um rascunho restaurado precisa reabrir os campos "Outras".
  test('reabre campos condicionais preenchidos ao restaurar', () => {
    FormHandler.carregarEstado({
      form: { reclamacao_outras_check: true, reclamacao_outras_text: 'motivo X' },
      observacoes: { ops: [] },
    });

    const campo = document.getElementById('reclamacao_outras_text');
    expect(campo.style.display).toBe('inline-block');
    expect(campo.value).toBe('motivo X');
  });
});

describe('sincronizarCondicionais()', () => {
  test('mostra o campo quando o checkbox está marcado', () => {
    document.getElementById('reclamacao_outras_check').checked = true;
    FormHandler.sincronizarCondicionais();
    expect(document.getElementById('reclamacao_outras_text').style.display).toBe('inline-block');
  });

  test('esconde e limpa o campo quando o checkbox é desmarcado', () => {
    const campo = document.getElementById('reclamacao_outras_text');
    campo.value = 'algo';
    document.getElementById('reclamacao_outras_check').checked = false;

    FormHandler.sincronizarCondicionais();

    expect(campo.style.display).toBe('none');
    expect(campo.value).toBe('');
  });

  test('textarea condicional usa display block', () => {
    document.getElementById('relatorio_foto_nao_check').checked = true;
    FormHandler.sincronizarCondicionais();
    expect(document.getElementById('justificativa_foto').style.display).toBe('block');
  });

  test('mostra o campo do radio somente no valor que o dispara', () => {
    const alvo = document.getElementById('danos_emergencial_outras_text');

    document.getElementById('danos_emergencial_outras').checked = true;
    FormHandler.sincronizarCondicionais();
    expect(alvo.style.display).toBe('block');

    document.getElementById('danos_emergencial_outras').checked = false;
    document.getElementById('danos_normal_sem_remocao').checked = true;
    FormHandler.sincronizarCondicionais();
    expect(alvo.style.display).toBe('none');
  });
});

describe('inicializarAutoSave()', () => {
  function elementos() {
    const span = document.createElement('span');
    span.id = 'autoSaveStatus';
    document.body.appendChild(span);
    return { autoSaveStatus: span };
  }

  test('não pergunta nada quando não há rascunho', async () => {
    global.carregarDB.mockResolvedValueOnce(null);
    FormHandler.init({
      autoSaveStatus: elementos().autoSaveStatus,
      btnSalvarProjeto: document.createElement('button'),
      inputCarregarProjeto: document.createElement('input'),
      btnNovoQuestionario: document.createElement('button'),
    });

    await FormHandler.inicializarAutoSave();
    expect(global.confirmar).not.toHaveBeenCalled();
  });

  test('restaura o rascunho quando o usuário confirma', async () => {
    global.carregarDB.mockResolvedValueOnce({
      form: { endereco: 'Rua Salva' },
      observacoes: { ops: [] },
      salvoEm: '2026-07-15T10:00:00.000Z',
    });
    global.confirmar.mockResolvedValueOnce(true);

    FormHandler.init({
      autoSaveStatus: elementos().autoSaveStatus,
      btnSalvarProjeto: document.createElement('button'),
      inputCarregarProjeto: document.createElement('input'),
      btnNovoQuestionario: document.createElement('button'),
    });

    await FormHandler.inicializarAutoSave();
    expect(document.getElementById('endereco').value).toBe('Rua Salva');
  });

  test('descarta o rascunho quando o usuário recusa', async () => {
    global.carregarDB.mockResolvedValueOnce({ form: { endereco: 'Rua Salva' } });
    global.confirmar.mockResolvedValueOnce(false);

    FormHandler.init({
      autoSaveStatus: elementos().autoSaveStatus,
      btnSalvarProjeto: document.createElement('button'),
      inputCarregarProjeto: document.createElement('input'),
      btnNovoQuestionario: document.createElement('button'),
    });

    await FormHandler.inicializarAutoSave();
    expect(global.limparDB).toHaveBeenCalled();
    expect(document.getElementById('endereco').value).toBe('');
  });
});
