# Guia de Logging - LexiDecis

## Visão Geral

O serviço de log centralizado (`logService.js`) foi criado para controlar os logs em produção, seguindo o padrão já existente no projeto. O serviço detecta automaticamente o ambiente (desenvolvimento vs produção) e ajusta o nível de logs adequadamente.

## Configuração Automática

### Ambientes Detectados
- **Desenvolvimento**: `localhost`, `127.0.0.1`, domínios com `dev` ou `test`
- **Produção**: Todos os outros domínios

### Níveis de Log por Ambiente

#### Desenvolvimento
```javascript
{
    DEBUG_MODE: true,    // Logs detalhados de debug
    INFO_MODE: true,     // Logs informativos
    WARN_MODE: true,     // Avisos
    ERROR_MODE: true,    // Erros
    API_LOGS: true,      // Logs específicos de API
    AUTH_LOGS: true,     // Logs de autenticação
    UI_LOGS: true        // Logs de interface
}
```

#### Produção
```javascript
{
    DEBUG_MODE: false,   // Sem logs de debug
    INFO_MODE: false,    // Sem logs informativos
    WARN_MODE: true,     // Apenas avisos
    ERROR_MODE: true,    // Apenas erros
    API_LOGS: false,     // Sem logs de API
    AUTH_LOGS: false,    // Sem logs de autenticação
    UI_LOGS: false       // Sem logs de interface
}
```

## Como Usar

### 1. Importar o Serviço

```javascript
import logService from './logService.js';
```

### 2. Métodos Disponíveis

#### Logs Básicos
```javascript
// Debug - apenas em desenvolvimento
logService.debug('contexto', 'mensagem', dados);

// Info - apenas em desenvolvimento
logService.info('contexto', 'mensagem', dados);

// Warning - sempre exibido
logService.warn('contexto', 'mensagem', dados);

// Error - sempre exibido
logService.error('contexto', 'mensagem', dados);

// Success - apenas em desenvolvimento
logService.success('contexto', 'mensagem', dados);
```

#### Logs Específicos
```javascript
// Logs de API - controlado por API_LOGS
logService.api('fetchUsers', 'Iniciando busca de usuários');

// Logs de autenticação - controlado por AUTH_LOGS
logService.auth('login', 'Usuário autenticado:', user.email);

// Logs de UI - controlado por UI_LOGS
logService.ui('sidebar', 'Sidebar aberto');
```

#### Logs Estruturados
```javascript
// Início e fim de operações
logService.start('fetchUsers', 'Iniciando busca de usuários');
logService.end('fetchUsers', 'Busca finalizada');

// Dados estruturados
logService.data('fetchUsers', responseData, 'Response data');

// Resposta de API completa
logService.response('fetchUsers', response, parsedData);

// Erro de API
logService.apiError('fetchUsers', error, response);
```

### 3. Exemplo de Implementação

#### Antes (com console.log direto)
```javascript
export async function fetchUsers(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  
  console.log('[fetchUsers] 🔍 Iniciando busca de usuários...');
  console.log('[fetchUsers] 👤 Usuário autenticado:', user.email);
  
  const token = await user.getIdToken();
  console.log('[fetchUsers] 🔑 Token obtido:', token ? 'Presente' : 'Ausente');
  
  // ... resto do código
}
```

#### Depois (com logService)
```javascript
import logService from '../../services/logService.js';

export async function fetchUsers(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  
  logService.start('fetchUsers', 'Iniciando busca de usuários');
  logService.api('fetchUsers', '👤 Usuário autenticado:', user.email);
  
  const token = await user.getIdToken();
  logService.api('fetchUsers', '🔑 Token obtido:', token ? 'Presente' : 'Ausente');
  
  // ... resto do código
}
```

## Migração de Arquivos Existentes

### 1. Substituir console.log por logService

```javascript
// Antes
console.log('[Contexto] Mensagem:', dados);

// Depois
logService.info('Contexto', 'Mensagem:', dados);
```

### 2. Substituir console.error por logService

```javascript
// Antes
console.error('[Contexto] Erro:', error);

// Depois
logService.error('Contexto', 'Erro:', error);
```

### 3. Substituir console.warn por logService

```javascript
// Antes
console.warn('[Contexto] Aviso:', warning);

// Depois
logService.warn('Contexto', 'Aviso:', warning);
```

## Controle Manual de Debug

### Forçar Modo Debug (Temporário)
```javascript
// Habilitar debug em produção (temporariamente)
logService.forceDebug(true);

// Desabilitar debug
logService.forceDebug(false);
```

### Verificar Configuração Atual
```javascript
const config = logService.getConfig();
console.log('Configuração atual:', config);
```

## Benefícios

### Em Desenvolvimento
- ✅ Logs detalhados para debugging
- ✅ Informações completas de API
- ✅ Rastreamento de fluxo de dados
- ✅ Debugging de autenticação

### Em Produção
- ✅ Console limpo (sem spam de logs)
- ✅ Apenas logs críticos (warnings e errors)
- ✅ Performance melhorada
- ✅ Segurança (sem exposição de dados sensíveis)

## Arquivos Migrados

- ✅ `admin/assets/js/api.js` - Função `fetchUsers`
- ✅ `services/renderer.js` - Logs de inicialização
- 🔄 Outros arquivos em processo de migração

## Próximos Passos

1. Migrar logs em `services/auth.js`
2. Migrar logs em `services/apiService.js`
3. Migrar logs em `services/gptManager.js`
4. Migrar logs em `services/uiManager.js`
5. Migrar logs em `services/statusCheck.js`

## Compatibilidade

O serviço mantém compatibilidade com o padrão existente através da função `debugLog`:

```javascript
import { debugLog } from './logService.js';

// Funciona igual ao padrão anterior
debugLog('Mensagem de debug');
``` 