/* global Editor, FormHandler, ReportGenerator, mostrarAlerta */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  Editor.init(
    '#editor-observacoes',
    '#toolbar-observacoes',
    () => FormHandler.salvarRascunhoLocal(),
    (msg) => mostrarAlerta(msg, 'info')
  );

  FormHandler.init({
    autoSaveStatus: document.getElementById('autoSaveStatus'),
    btnSalvarProjeto: document.getElementById('btnSalvarProjeto'),
    inputCarregarProjeto: document.getElementById('inputCarregarProjeto'),
    btnNovoQuestionario: document.getElementById('btnNovoQuestionario'),
  });

  document.getElementById('generateReportBtn').addEventListener('click', () => {
    ReportGenerator.gerar();
  });

  FormHandler.inicializarAutoSave();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.update();
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const toast = document.getElementById('toast-atualizacao');
    if (toast) toast.hidden = false;
  });

  const btnRecarregar = document.getElementById('btn-recarregar');
  if (btnRecarregar) {
    btnRecarregar.addEventListener('click', () => window.location.reload());
  }
}
