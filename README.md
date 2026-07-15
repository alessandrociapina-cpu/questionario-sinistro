# questionario-sinistro

Questionário de Apuração de Sinistro Operacional — Sabesp.

Aplicativo web (PWA) para preencher o Questionário de Apuração de Responsabilidade e gerar um
relatório pronto para imprimir ou salvar em PDF. Funciona **offline** e **sem servidor**: nada do
que é digitado sai do navegador.

## Como usar

Acesse: **https://alessandrociapina-cpu.github.io/questionario-sinistro/**

Para instalar como aplicativo (Chrome/Edge): abra o endereço acima e use o ícone de instalar na
barra de endereços. Depois de instalado, funciona sem internet.

## Recursos

- **Rascunho automático** — o preenchimento é salvo no próprio dispositivo a cada 5 segundos. Ao
  reabrir, o app pergunta se você quer continuar de onde parou.
- **Baixar / Carregar Projeto** — exporta o questionário em `.json` para arquivar, continuar em
  outro computador ou enviar a um colega.
- **Campo 10 com formatação** — barra de ferramentas com fonte, tamanho, negrito, itálico,
  sublinhado, cores, alinhamento, listas, linhas horizontais e tabelas.
- **Relatório para impressão** — gera a versão visual e imprime (recomendado: destino
  "Guardar como PDF").

## Desenvolvimento

```bash
npm install
npm test        # Jest
npm run lint    # ESLint
```

Detalhes de arquitetura, versionamento do Service Worker e decisões de projeto: [CLAUDE.md](CLAUDE.md).

## Licença de terceiros

[Quill](https://quilljs.com/) 2.0.3 (MIT) — hospedado localmente em `vendor/`.
