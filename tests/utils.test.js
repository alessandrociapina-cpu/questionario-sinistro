'use strict';

const {
  esc,
  formatarDataISO,
  sanitizarNomeArquivo,
  validarEsquemaProjeto,
  nomeArquivoProjeto,
} = require('../utils');

describe('esc()', () => {
  test('escapa < e >', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  test('escapa &', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });
  test('escapa aspas duplas e simples', () => {
    expect(esc('"x"')).toBe('&quot;x&quot;');
    expect(esc("'x'")).toBe('&#39;x&#39;');
  });
  test('devolve string vazia para null e undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('formatarDataISO()', () => {
  test('converte AAAA-MM-DD para DD/MM/AAAA', () => {
    expect(formatarDataISO('2026-07-15')).toBe('15/07/2026');
  });
  test('devolve string vazia quando não há data', () => {
    expect(formatarDataISO('')).toBe('');
  });
  test('devolve o valor original quando o formato é inesperado', () => {
    expect(formatarDataISO('15/07/2026')).toBe('15/07/2026');
  });
});

describe('sanitizarNomeArquivo()', () => {
  // 'é', ',' e o espaço viram um '_' cada um.
  test('troca caracteres especiais por _', () => {
    expect(sanitizarNomeArquivo('Rua José, 123')).toBe('Rua_Jos___123');
  });
  test('usa um padrão quando vazio', () => {
    expect(sanitizarNomeArquivo('')).toBe('sem-endereco');
    expect(sanitizarNomeArquivo('   ')).toBe('sem-endereco');
  });
});

describe('nomeArquivoProjeto()', () => {
  test('monta o nome com data e endereço', () => {
    expect(nomeArquivoProjeto('Rua A', '2026-07-15')).toBe('sinistro-2026-07-15-Rua_A.json');
  });
  test('sem data, usa a data de hoje', () => {
    const nome = nomeArquivoProjeto('Rua A', '');
    expect(nome).toMatch(/^sinistro-\d{4}-\d{2}-\d{2}-Rua_A\.json$/);
  });
});

describe('validarEsquemaProjeto()', () => {
  test('aceita objeto com form', () => {
    expect(validarEsquemaProjeto({ form: { endereco: 'Rua A' } })).toBe(true);
  });

  test('aceita observacoes em formato Delta', () => {
    expect(validarEsquemaProjeto({ form: {}, observacoes: { ops: [{ insert: 'oi' }] } })).toBe(true);
  });

  test('aceita observacoes ausente ou nula', () => {
    expect(validarEsquemaProjeto({ form: {} })).toBe(true);
    expect(validarEsquemaProjeto({ form: {}, observacoes: null })).toBe(true);
  });

  test('recusa valores que não são objeto', () => {
    expect(validarEsquemaProjeto(null)).toBe(false);
    expect(validarEsquemaProjeto('texto')).toBe(false);
    expect(validarEsquemaProjeto([])).toBe(false);
  });

  test('recusa form que não é objeto', () => {
    expect(validarEsquemaProjeto({ form: 'x' })).toBe(false);
    expect(validarEsquemaProjeto({ form: [] })).toBe(false);
  });

  // Esta é a barreira que impede um .json adulterado de virar HTML no relatório.
  test('recusa observacoes como HTML cru', () => {
    expect(validarEsquemaProjeto({ form: {}, observacoes: '<img onerror=alert(1)>' })).toBe(false);
  });

  test('recusa observacoes sem a lista ops', () => {
    expect(validarEsquemaProjeto({ form: {}, observacoes: {} })).toBe(false);
    expect(validarEsquemaProjeto({ form: {}, observacoes: { ops: 'x' } })).toBe(false);
  });
});
