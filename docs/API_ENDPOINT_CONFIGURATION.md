# Configuração de Endpoints da API

## Visão Geral

O sistema LexiDecis utiliza uma arquitetura híbrida para chamadas de API, priorizando o uso do `ApiService` quando as configurações estão disponíveis, e fazendo fallback para `fetch` direto quando necessário.

## Carregamento de Configurações

### 1. Endpoint Principal
As configurações são carregadas do endpoint principal após o login:
```
GET /endpoint-principal
```

### 2. Estrutura de Configuração
```javascript
{
  "endpoints": {
    "flowise": { /* configurações do Flowise */ },
    "apiCredentials": {
      "updateChat": "https://webhook.power.tec.br/webhook/lexidecis/chats",
      "createChatMessage": "https://webhook.power.tec.br/webhook/lexidecis/v2/chatmessage",
      // ... outros endpoints
    }
  }
}
```

## Estratégia de Chamadas de API

### 1. Prioridade: ApiService
Quando uma configuração está disponível no `apiCredentials`, o sistema usa o `ApiService`:

```javascript
if (this.config.apiCredentials.updateChat) {
    const result = await this.apiService.request('updateChat', params, 'POST');
}
```

### 2. Fallback: Fetch Direto
Quando a configuração não está disponível, usa `fetch` direto como fallback:

```javascript
const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/chats', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(params)
});
```

## Endpoints Implementados

### 1. updateChat
- **Propósito**: Atualizar informações do chat
- **Método**: POST
- **Parâmetros**:
  - `gpt_id`: ID do GPT selecionado
  - `user_name`: Nome do usuário
  - `user_id`: ID do usuário
  - `sessionid`: ID da sessão atual

### 2. createChatMessage
- **Propósito**: Criar nova mensagem no chat
- **Método**: POST
- **Parâmetros**:
  - `chatflowId`: ID do fluxo do chat
  - `sessionId`: ID da sessão
  - `role`: 'user'
  - `content`: Conteúdo da mensagem

## Logs de Debug

O sistema inclui logs detalhados para facilitar o debug:

```javascript
console.log('🔗 apiCredentials disponíveis:', Object.keys(this.config.apiCredentials));
console.log('🔗 Usando ApiService para updateChat');
console.log('🔗 Configuração updateChat não encontrada, usando fetch direto');
```

## Localização no Código

### Observer Loading (Flowise)
As chamadas de API são feitas no `observeLoading` do Flowise em `services/uiManager.js`:

```javascript
observersConfig: {
    observeLoading: async (loading) => {
        if (loading) {
            // Captura input do usuário
            // Faz POST para createChatMessage
            // Faz POST para updateChat
        }
    }
}
```

### Renderer
O carregamento das configurações acontece em `services/renderer.js`:

```javascript
CONFIG.apiCredentials = { ...endpoints.apiCredentials };
debugLog("[Renderer] apiCredentials disponíveis:", Object.keys(CONFIG.apiCredentials));
```

## Benefícios da Arquitetura

1. **Flexibilidade**: Permite usar tanto ApiService quanto fetch direto
2. **Debugging**: Logs detalhados para identificar problemas
3. **Manutenibilidade**: Configurações centralizadas
4. **Fallback**: Sistema continua funcionando mesmo sem configurações

## Troubleshooting

### Problema: "Configuração updateChat não encontrada"
**Solução**: Verificar se o endpoint principal está retornando a configuração `updateChat` no `apiCredentials`.

### Problema: "Erro no updateChat via ApiService"
**Solução**: Verificar se a URL configurada no `apiCredentials.updateChat` está correta e acessível.

### Problema: "Erro no updateChat via fetch direto"
**Solução**: Verificar se a URL hardcoded está correta e se o token de autenticação é válido. 