# CLAUDE.md — Questionário de Apuração de Responsabilidade

## Visão geral

PWA 100% client-side para preencher o Questionário de Apuração de Responsabilidade de sinistros
(Sabesp) e gerar um relatório pronto para impressão/PDF. Sem backend — todo o processamento ocorre
no navegador. Funciona offline após o primeiro carregamento via Service Worker.

## Comandos essenciais

```bash
npm test                  # Roda todos os testes (Jest + jsdom)
npm run test:coverage     # Testes com relatório de cobertura
npm run lint              # Verifica ESLint
npm run lint:fix          # Corrige automaticamente com ESLint
npm run format            # Aplica Prettier em JS/HTML/CSS
```

## Arquitetura dos módulos JS

| Arquivo              | Responsabilidade                                                              |
| -------------------- | ---------------------------------------------------------------------------- |
| `script.js`          | Ponto de entrada; inicializa os módulos e registra o Service Worker           |
| `formHandler.js`     | Campos condicionais, auto-save com debounce no IndexedDB, export/import JSON  |
| `reportGenerator.js` | Clona o formulário e monta o relatório visual para impressão                  |
| `utils.js`           | Funções puras: `esc()`, `formatarDataISO()`, `validarEsquemaProjeto()`        |
| `domUtils.js`        | Modais de alerta e confirmação (`mostrarAlerta`, `confirmar`)                 |
| `modules/storage.js` | Wrapper do IndexedDB (`salvarDB`, `carregarDB`, `limparDB`)                   |
| `modules/editor.js`  | Editor Quill do campo 10, formatos registrados e ações de tabela             |
| `vendor/`            | Quill 2.0.3 (MIT) hospedado localmente — não editar, não passar lint/prettier |

## Campo 10 — editor de texto rico

O campo "10 - Observações/Considerações" usa **Quill 2** (licença MIT, hospedado em `vendor/`, sem
CDN, para funcionar offline). Duas decisões importantes:

1. **Formatos por estilo, não por classe.** `modules/editor.js` registra `attributors/style/*` em vez
   dos de classe. Assim o HTML gerado carrega `style="font-family: Arial"` embutido e sobrevive ao
   relatório e à impressão sem depender do CSS do Quill.

2. **O estado é salvo como Delta, nunca como HTML.** `validarEsquemaProjeto()` recusa qualquer
   `observacoes` que não seja `{ ops: [...] }`. É isso que impede um arquivo `.json` adulterado de
   injetar marcação arbitrária no relatório — o Quill só renderiza formatos que conhece.

O bloco de observações do relatório reaproveita a classe `ql-editor` para herdar do CSS do Quill a
renderização de listas e tabelas; `.report-rich-text` apenas desfaz altura fixa, rolagem e padding.

Tabelas usam o módulo `table` nativo do Quill 2 (inserir 3×3, linhas e colunas). Ele **não** faz
mesclar/dividir células — é uma limitação conhecida do Quill 2, não um bug.

## Rascunho e continuidade

Três caminhos, todos em `formHandler.js`:

- **Auto-save**: grava o estado completo no IndexedDB com debounce de 5s a cada mudança. Ao abrir,
  `inicializarAutoSave()` pergunta se o usuário quer continuar de onde parou.
- **💾 Baixar Projeto**: exporta um `.json` (`sinistro-AAAA-MM-DD-endereco.json`) para arquivar ou
  levar para outro dispositivo.
- **📂 Carregar Projeto**: valida o esquema e restaura o formulário + o editor.

`sincronizarCondicionais()` reaplica a visibilidade dos campos "Outras" a partir do estado atual —
é o que faz um rascunho restaurado reabrir os campos que estavam preenchidos.

## Service Worker e versionamento

A cada release, **todos** estes pontos devem ser atualizados com o novo número de versão (ex: `2`):

- `sw.js`: `CACHE_NAME = 'sinistro-app-v2'` e todos os `?v=2` em `urlsToCache`
- `index.html`: `?v=2` em todos os `<link>` e `<script>` + "Versão 2.0 | Última atualização: DD/MM/AAAA"

Os arquivos de `vendor/` são cacheados sem `?v=` — a versão está fixada no nome da dependência.

## Testes

- **Framework**: Jest 29 + jest-environment-jsdom (docblock `@jest-environment jsdom` por arquivo)
- **Localização**: `tests/*.test.js`
- Cobrem `utils`, `modules/storage` (via `fake-indexeddb`) e `formHandler` (via jsdom, com `Editor`
  e os wrappers do IndexedDB mockados)

## Linting e formatação

- **ESLint** ^8 — `eslint:recommended` + browser/ES2021; regras chave: `no-var`, `eqeqeq`, `prefer-const`
- **Prettier** ^3 — `singleQuote: true`, `semi: true`, `tabWidth: 2`, `printWidth: 100`
- **Husky + lint-staged**: pre-commit roda ESLint --fix + Prettier nos arquivos staged
- `vendor/` está em `.eslintignore` e `.prettierignore`

## CI/CD (GitHub Actions)

- `.github/workflows/ci.yml`: push em `main` ou `claude/**` → `npm run lint` + `npm test`
- `.github/workflows/lighthouse.yml`: audit de performance com LHCI
- Publicação: GitHub Pages a partir da branch `main` (raiz do repositório)
