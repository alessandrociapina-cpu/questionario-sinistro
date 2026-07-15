'use strict';

const { IDBFactory } = require('fake-indexeddb');

global.indexedDB = new IDBFactory();

beforeEach(() => {
  global.indexedDB = new IDBFactory();
  jest.resetModules();
});

function freshStorage() {
  return require('../modules/storage');
}

describe('storage — initDB()', () => {
  test('resolve com um objeto IDBDatabase', async () => {
    const { initDB } = freshStorage();
    const db = await initDB();
    expect(db).toBeDefined();
    expect(typeof db.transaction).toBe('function');
  });
});

describe('storage — salvarDB() e carregarDB()', () => {
  test('salva e recupera o estado', async () => {
    const { salvarDB, carregarDB } = freshStorage();
    const estado = { versao: 1, form: { endereco: 'Rua A' }, observacoes: { ops: [] } };
    await salvarDB(estado);
    expect(await carregarDB()).toEqual(estado);
  });

  test('carregarDB devolve undefined quando não há rascunho', async () => {
    const { carregarDB } = freshStorage();
    expect(await carregarDB()).toBeUndefined();
  });

  test('salvar duas vezes sobrescreve o rascunho anterior', async () => {
    const { salvarDB, carregarDB } = freshStorage();
    await salvarDB({ form: { endereco: 'Rua A' } });
    await salvarDB({ form: { endereco: 'Rua B' } });
    const lido = await carregarDB();
    expect(lido.form.endereco).toBe('Rua B');
  });
});

describe('storage — limparDB()', () => {
  test('remove o rascunho salvo', async () => {
    const { salvarDB, carregarDB, limparDB } = freshStorage();
    await salvarDB({ form: { endereco: 'Rua A' } });
    await limparDB();
    expect(await carregarDB()).toBeUndefined();
  });

  test('não falha quando não há nada para limpar', async () => {
    const { limparDB } = freshStorage();
    await expect(limparDB()).resolves.toBeUndefined();
  });
});
