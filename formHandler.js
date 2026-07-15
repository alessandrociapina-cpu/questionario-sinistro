/* global Editor, mostrarAlerta, confirmar, salvarDB, carregarDB, limparDB, validarEsquemaProjeto, nomeArquivoProjeto, ESTADO_VERSAO, formatarDataISO */
'use strict';

const FormHandler = (() => {
  let _el;
  let _timeoutSalvar;

  const DEBOUNCE_MS = 5000;

  // [checkbox que dispara, campo que aparece]
  const CONDICIONAIS = [
    ['reclamacao_outras_check', 'reclamacao_outras_text'],
    ['providencias_outras_check', 'providencias_outras_text'],
    ['origem_outras_check', 'origem_outras_text'],
    ['obras_outras_check', 'obras_outras_text'],
    ['resp_outras_check', 'resp_outras_text'],
    ['coop_outras_check', 'coop_outras_text'],
    ['parcial_outras_check', 'parcial_outras_text'],
    ['prejuizo_outras_check', 'prejuizo_outras_text'],
    ['relatorio_foto_nao_check', 'justificativa_foto'],
  ];

  // [grupo de radio, valor que dispara, campo que aparece, placeholder]
  const CONDICIONAIS_RADIO = [
    [
      'danos_providencias',
      'emergencial_outras',
      'danos_emergencial_outras_text',
      'Descreva as outras providências',
    ],
  ];

  function _campos() {
    return document.querySelectorAll(
      '#questionarioForm input, #questionarioForm select, #questionarioForm textarea'
    );
  }

  function _display(target) {
    return target.tagName === 'TEXTAREA' ? 'block' : 'inline-block';
  }

  /**
   * Aplica a visibilidade dos campos condicionais a partir do estado atual dos
   * checkboxes/radios. Diferente de um listener de 'change', pode ser chamada a
   * qualquer momento — é o que faz um rascunho restaurado reabrir os campos
   * "Outras" que estavam preenchidos.
   */
  function sincronizarCondicionais() {
    CONDICIONAIS.forEach(([triggerId, targetId]) => {
      const trigger = document.getElementById(triggerId);
      const target = document.getElementById(targetId);
      if (!trigger || !target) return;
      if (trigger.checked) {
        target.style.display = _display(target);
      } else {
        target.style.display = 'none';
        target.value = '';
      }
    });

    CONDICIONAIS_RADIO.forEach(([grupo, valorGatilho, targetId, placeholder]) => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const ativo = document.querySelector(`input[name="${grupo}"]:checked`);
      if (ativo && ativo.value === valorGatilho) {
        target.style.display = _display(target);
        if (placeholder) target.placeholder = placeholder;
      } else {
        target.style.display = 'none';
        target.value = '';
        target.placeholder = '';
      }
    });
  }

  function exportarEstado() {
    const form = {};
    _campos().forEach((el) => {
      if (!el.id) return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        form[el.id] = el.checked;
      } else {
        form[el.id] = el.value;
      }
    });

    return {
      versao: ESTADO_VERSAO,
      salvoEm: new Date().toISOString(),
      form,
      observacoes: Editor.getDelta(),
    };
  }

  function carregarEstado(dados) {
    const form = dados.form || {};
    _campos().forEach((el) => {
      if (!el.id || !Object.prototype.hasOwnProperty.call(form, el.id)) return;
      const valor = form[el.id];
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = !!valor;
      } else {
        el.value = valor === null || valor === undefined ? '' : String(valor);
      }
    });

    Editor.setDelta(dados.observacoes);
    sincronizarCondicionais();
  }

  function _statusSalvando() {
    _el.autoSaveStatus.textContent = 'Digitando... (aguardando para salvar)';
    _el.autoSaveStatus.style.color = '#6c757d';
  }

  function salvarRascunhoLocal() {
    clearTimeout(_timeoutSalvar);
    _statusSalvando();

    _timeoutSalvar = setTimeout(async () => {
      try {
        await salvarDB(exportarEstado());
        const agora = new Date();
        const hora = `${agora.getHours()}:${String(agora.getMinutes()).padStart(2, '0')}`;
        _el.autoSaveStatus.textContent = `✔ Salvo às ${hora}`;
        _el.autoSaveStatus.style.color = 'green';
      } catch (e) {
        _el.autoSaveStatus.textContent = '⚠️ Falha ao armazenar. Use "Baixar Projeto" para garantir!';
        _el.autoSaveStatus.style.color = '#d9534f';
        console.error('Falha interna no IndexedDB:', e);
      }
    }, DEBOUNCE_MS);
  }

  async function inicializarAutoSave() {
    try {
      const dados = await carregarDB();
      if (!dados || !validarEsquemaProjeto(dados)) return;

      const endereco = (dados.form && dados.form.endereco) || 'Endereço não informado';
      const salvoEm = dados.salvoEm ? new Date(dados.salvoEm).toLocaleString('pt-BR') : 'data desconhecida';

      const msg =
        `Encontramos um questionário em andamento salvo neste dispositivo:\n\n` +
        `📍 Endereço: ${endereco}\n` +
        `📅 Salvo em: ${salvoEm}\n\n` +
        `Deseja continuar de onde parou?`;

      if (await confirmar(msg)) {
        carregarEstado(dados);
        _el.autoSaveStatus.textContent = 'Rascunho restaurado.';
        _el.autoSaveStatus.style.color = 'green';
      } else {
        await limparDB();
        _el.autoSaveStatus.textContent = 'Nenhum rascunho salvo';
      }
    } catch (e) {
      console.error('Erro ao recuperar o rascunho:', e);
    }
  }

  function _baixarProjeto() {
    const estado = exportarEstado();
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivoProjeto(estado.form.endereco, estado.form.reclamacao_data);
    a.click();
    URL.revokeObjectURL(url);
  }

  function _carregarProjeto(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = async (e) => {
      try {
        const dados = JSON.parse(e.target.result);
        if (!validarEsquemaProjeto(dados)) {
          await mostrarAlerta('Arquivo de projeto inválido ou corrompido.', 'erro');
          return;
        }
        carregarEstado(dados);
        salvarRascunhoLocal();
        await mostrarAlerta('Projeto carregado com sucesso.', 'info');
      } catch (err) {
        console.error('Falha ao ler o projeto:', err);
        await mostrarAlerta('Não foi possível ler o arquivo. Ele é um JSON válido?', 'erro');
      } finally {
        // Permite recarregar o mesmo arquivo novamente
        evento.target.value = '';
      }
    };
    leitor.readAsText(arquivo);
  }

  async function _novoQuestionario() {
    const ok = await confirmar(
      'Isto vai apagar todos os campos preenchidos e o rascunho salvo neste dispositivo.\n\nDeseja continuar?'
    );
    if (!ok) return;

    document.getElementById('questionarioForm').reset();
    Editor.setDelta(null);
    sincronizarCondicionais();
    await limparDB();
    _el.autoSaveStatus.textContent = 'Nenhum rascunho salvo';
    _el.autoSaveStatus.style.color = '#6c757d';
  }

  function init(elementos) {
    _el = elementos;

    _campos().forEach((el) => {
      const evento = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' ? 'change' : 'input';
      el.addEventListener(evento, salvarRascunhoLocal);
    });

    CONDICIONAIS.forEach(([triggerId]) => {
      const trigger = document.getElementById(triggerId);
      if (trigger) trigger.addEventListener('change', sincronizarCondicionais);
    });

    CONDICIONAIS_RADIO.forEach(([grupo]) => {
      document
        .querySelectorAll(`input[name="${grupo}"]`)
        .forEach((r) => r.addEventListener('change', sincronizarCondicionais));
    });

    _el.btnSalvarProjeto.addEventListener('click', (e) => {
      e.preventDefault();
      _baixarProjeto();
    });

    _el.inputCarregarProjeto.addEventListener('change', _carregarProjeto);

    _el.btnNovoQuestionario.addEventListener('click', (e) => {
      e.preventDefault();
      _novoQuestionario();
    });

    sincronizarCondicionais();
  }

  return {
    init,
    exportarEstado,
    carregarEstado,
    sincronizarCondicionais,
    salvarRascunhoLocal,
    inicializarAutoSave,
  };
})();

/* global module */
if (typeof module !== 'undefined') module.exports = { FormHandler };
