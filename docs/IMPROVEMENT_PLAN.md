# Plano de Melhorias – LexiDecis

Este documento consolida a lista de melhorias priorizadas, com status e próximos passos. Use-o como referência para execução incremental.

## Status rápido

- 1) Unificação de Firebase (app principal): CONCLUÍDO (commit 6bc1758)
- 2–20) Demais itens: PENDENTES (detalhados abaixo)

## Tabela de melhorias

| Nº | Melhoria | Urgência | Complexidade | Status | Próximos passos |
|---:|---|---|---|---|---|
| 1 | Unificar inicialização do Firebase (remover duplicidades) | Alta | Baixa | Concluído | Validar subapps (`chat/`, `admin/`, `instance/*`) se desejado |
| 2 | Padronizar rotas/redirecionamentos | Alta | Baixa | Pendente | Criar helper `navigateTo()` e revisar `login.js`, `auth.js`, `renderer.js` |
| 3 | Centralizar configuração (vs `config/app.config.js`) | Alta | Média | Pendente | Definir fonte única: endpoints dinâmicos + overrides por env |
| 4 | SweetAlert2 em todo app (sem `alert()/prompt()`) | Alta | Baixa | Pendente | Substituir em `login.js`, `auth.js`, `uiManager.js`, `statusCheck.js` |
| 5 | JWT em memória (`getIdToken()` + `onIdTokenChanged`) | Alta | Média | Pendente | Remover `sessionStorage` do token e criar util de token |
| 6 | Guardas de rota para admin (front + server) | Alta | Média | Pendente | Middleware front + verificação no backend; ocultar `admin/index.html` |
| 7 | SRI e CSP para CDNs | Alta | Média | Pendente | Adicionar `integrity`/`crossorigin` e política CSP nas páginas |
| 8 | Tratamento de erros no `ApiService` (retries/backoff) | Média | Média | Pendente | Adapter para mensagens do backend e erros JSON |
| 9 | Endpoints sem auth no `ApiService` | Média | Baixa | Pendente | Flag por endpoint; pular `Authorization` quando não necessário |
| 10 | Minimizar PII em storages | Média | Média | Pendente | Remover email/uid onde não essencial; usar IDs opacos |
| 11 | Unificar gerenciamento de URL | Média | Média | Pendente | Extrair util/roteador e remover duplicidade de lógica |
| 12 | Níveis de log via `logService` (silenciar `console.log` prod) | Média | Baixa | Pendente | Gate por `NODE_ENV`; mapear DEBUG_MODE para `logService` |
| 13 | Bundler (Vite/ESBuild) e mover CSS inline | Média | Média | Pendente | Setup Vite; módulos ES; splitting; assets hashing |
| 14 | Padronizar `unifiedLoadingManager` em todos os fluxos | Média | Baixa | Pendente | Envolver login/endpoints/GPT/histórico com steps |
| 15 | Normalizar respostas das APIs (`readChat`, etc.) | Média | Média | Pendente | Criar camadas de normalização no `ApiService` |
| 16 | Helper de navegação (`navigateTo()`) | Média | Baixa | Pendente | Substituir redirecionamentos dispersos e corrigir caminhos |
| 17 | Acessibilidade (ARIA/foco/teclado/contraste) | Baixa | Baixa | Pendente | Revisão de modais e elementos interativos |
| 18 | Testes (GPT/URL/admin/token expirado) | Baixa | Média | Pendente | Adicionar casos e páginas de teste dedicadas |
| 19 | Cache leve de `getJwt()` com invalidação | Baixa | Baixa | Pendente | Memoize curto com invalidação por `onIdTokenChanged` |
| 20 | Documentar CORS/origens confiáveis | Baixa | Baixa | Pendente | Adicionar política e exemplos para `webhook.power.tec.br`/Flowise |

## Detalhes da implementação realizada (item 1)

- Centralizado Firebase apenas em `services/auth.js` no app principal.
- Removidas inicializações duplicadas em `services/login.js`, `services/renderer.js`.
- `services/presenceService.js` agora reutiliza `db` de `auth.js`.
- `services/profileManager.js` reutiliza `auth` compartilhado e compatibiliza a assinatura do construtor.
- Commit: `6bc1758` em `main`.

## Observações

- Subaplicações em `chat/`, `admin/` e `instance/*` mantêm suas inicializações próprias por serem apps separados. Se desejado, aplicar a mesma padronização nelas como tarefa futura.


