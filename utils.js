'use strict';

const DEPARTAMENTO_PADRAO = 'Divisão de Manutenção e Serviços<br>de São José dos Campos.';

const ESTADO_VERSAO = 1;

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarDataISO(dateStr) {
  if (!dateStr) return '';
  const partes = dateStr.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dateStr;
}

function sanitizarNomeArquivo(valor) {
  if (!valor || !valor.trim()) return 'sem-endereco';
  return valor.trim().replace(/[^a-zA-Z0-9-]/g, '_');
}

/**
 * Valida o JSON de um projeto antes de carregá-lo.
 *
 * O campo `observacoes` é um Delta do Quill (JSON estruturado), nunca HTML.
 * Recusar qualquer coisa fora do formato `{ ops: [...] }` é o que impede um
 * arquivo de projeto adulterado de injetar marcação arbitrária no relatório.
 */
function validarEsquemaProjeto(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return false;
  if ('form' in dados && (typeof dados.form !== 'object' || Array.isArray(dados.form))) {
    return false;
  }
  if (dados.observacoes !== undefined && dados.observacoes !== null) {
    if (typeof dados.observacoes !== 'object' || Array.isArray(dados.observacoes)) return false;
    if (!Array.isArray(dados.observacoes.ops)) return false;
  }
  return true;
}

function nomeArquivoProjeto(endereco, data) {
  const dataArquivo = data || new Date().toISOString().slice(0, 10);
  return `sinistro-${dataArquivo}-${sanitizarNomeArquivo(endereco)}.json`;
}

/* global module */
if (typeof module !== 'undefined') {
  module.exports = {
    DEPARTAMENTO_PADRAO,
    ESTADO_VERSAO,
    esc,
    formatarDataISO,
    sanitizarNomeArquivo,
    validarEsquemaProjeto,
    nomeArquivoProjeto,
  };
}
