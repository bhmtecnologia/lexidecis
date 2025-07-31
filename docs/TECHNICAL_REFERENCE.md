# Referência Técnica - LexiDecis

## Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Gestão de Cores do Chatbot](#gestão-de-cores-do-chatbot)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [APIs e Endpoints](#apis-e-endpoints)
5. [Configurações](#configurações)
6. [Troubleshooting](#troubleshooting)

## Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UIManager     │    │   ChatManager   │    │   GPTManager    │
│                 │    │                 │    │                 │
│ • Interface     │◄──►│ • Conversas     │◄──►│ • Modelos IA    │
│ • Configurações │    │ • Histórico     │    │ • Seleção       │
│ • Eventos       │    │ • CRUD          │    │ • Configurações │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  StateManager   │    │   ApiService    │    │   Flowise       │
│                 │    │                 │    │                 │
│ • Estado Global │    │ • HTTP Requests │    │ • Chatbot       │
│ • Persistência  │    │ • JWT Auth      │    │ • Tema          │
│ • Cache         │    │ • Error Handling│    │ • Configurações │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Fluxo de Dados

1. **Inicialização**: `renderer.js` → `UIManager` → `Chatbot.initFull()`
2. **Seleção de GPT**: `GPTManager` → `StateManager` → `UIManager`
3. **Envio de Mensagem**: `UIManager` → `ApiService` → `Flowise`
4. **Recebimento**: `Flowise` → `ChatManager` → `UIManager`

## Gestão de Cores do Chatbot

### Configuração Principal

**Arquivo**: `services/uiManager.js`  
**Função**: `initializeChatbot()` (linhas 315-520)

### Estrutura de Configuração

```javascript
Chatbot.initFull({
    theme: {
        button: { /* Configurações do botão */ },
        disclaimer: { /* Configurações do disclaimer */ },
        customCSS: `/* CSS customizado */`,
        chatWindow: {
            backgroundColor: '#212529',        // ← FUNDO PRINCIPAL
            botMessage: {
                backgroundColor: '#212529',    // ← MENSAGENS DO BOT
                textColor: '#ffffff',
            },
            userMessage: {
                backgroundColor: '#343a40',    // ← MENSAGENS DO USUÁRIO
                textColor: '#ffffff',
            },
            textInput: {
                backgroundColor: '#212529',    // ← CAMPO DE ENTRADA
                textColor: '#ffffff',
            },
        }
    }
});
```

### CSS Customizado para Bolhas

```javascript
customCSS: `
    .chatbot-host-bubble {
        background-color: #212529 !important;  // ← COR DAS BOLHAS
        color: #ffffff !important;
        border: none !important;               // ← BORDA REMOVIDA
    }
    
    .chatbot-host-bubble:hover {
        background-color: #343a40 !important;  // ← COR NO HOVER
    }
`
```

### Paleta de Cores Padrão

| Elemento | Cor | Descrição |
|----------|-----|-----------|
| Fundo Principal | `#212529` | Bootstrap bg-dark |
| Mensagens Bot | `#212529` | Mesma cor do fundo |
| Mensagens User | `#343a40` | Cinza médio |
| Campo Entrada | `#212529` | Mesma cor do fundo |
| Hover | `#343a40` | Cinza médio |

### Como Alterar Cores

#### 1. Fundo Principal
```javascript
// Linha ~456
backgroundColor: '#1a1a1a',  // Exemplo: preto mais escuro
```

#### 2. Mensagens do Bot
```javascript
// Linha ~471
botMessage: {
    backgroundColor: '#2d2d2d',  // Exemplo: cinza escuro
}
```

#### 3. Bolhas de Mensagem (CSS)
```javascript
// Linha ~415
.chatbot-host-bubble {
    background-color: #2d2d2d !important;
}
```

## Estrutura de Arquivos

### Diretórios Principais

```
lexidecis/
├── services/           # Lógica de negócio
│   ├── uiManager.js    # Gerencia interface e chatbot
│   ├── chatManager.js  # Gerencia conversas
│   ├── gptManager.js   # Gerencia modelos IA
│   ├── stateManager.js # Gerencia estado
│   ├── apiService.js   # Comunicação HTTP
│   └── web.js          # Flowise chatbot
├── styles/             # Estilos CSS
│   ├── chat.css        # Estilos principais
│   └── color-chat.css  # Variáveis de cor
├── pages/              # Páginas principais
│   └── chat.html       # Página do chat
└── docs/               # Documentação
    └── CHATBOT_COLOR_MANAGEMENT.md
```

### Arquivos de Configuração

| Arquivo | Propósito | Localização |
|---------|-----------|-------------|
| `uiManager.js` | Configuração do chatbot | `services/uiManager.js` |
| `chat.css` | Variáveis CSS globais | `styles/chat.css` |
| `color-chat.css` | Paleta de cores | `chat/assets/css/color-chat.css` |

## APIs e Endpoints

### Endpoints Principais

```javascript
const ENDPOINTS = {
    CHATS: '/webhook/v2/chats',
    GPTS: '/webhook/lexidecis/gpt/list',
    GPT_CONFIG: '/webhook/lexidecis/gpt/config',
    CHAT_MESSAGE: '/webhook/lexidecis/v2/chatmessage',
    DOCUMENT_STORE: '/webhook/lexidecis/v2/documentstore'
};
```

### Configuração de Autenticação

```javascript
// JWT automático em todas as requisições
const jwt = await getJwt();
fetchOptions.headers['Authorization'] = `Bearer ${jwt}`;
```

### Configuração do Flowise

```javascript
const flowiseConfig = {
    chatflowid: selectedFlowiseConfig.chatflowId,
    apiHost: selectedFlowiseConfig.apiHost,
    token: selectedFlowiseConfig.token,
    theme: window.flowiseConfig.theme
};
```

## Configurações

### Variáveis de Ambiente

```javascript
// Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD7Gh-UfV-LyueKtlUcY9nny_o-UWmlmJM",
    authDomain: "lexidecis.firebaseapp.com",
    projectId: "lexidecis",
    // ...
};

// API Base
const ENDPOINT_URL = 'https://webhook.power.tec.br/webhook/lexidecis/endpoints';
```

### Configurações de Debug

```javascript
const DEBUG_MODE = isLocalhost; // Ativo apenas em localhost
const ENDPOINT_TIMEOUT_MS = 3000;
const ENDPOINT_MAX_RETRIES = 3;
```

### Configurações de Loading

```javascript
const etapasDeCarregamento = [
    'Verificar Status do Sistema',
    'Autenticação',
    'Carregar Endpoints',
    'Pré-carregar GPTs',
    'Selecionar GPT Padrão',
    'Inicializar Chatbot',
    'Carregar Lista de Chats'
];
```

## Troubleshooting

### Problemas Comuns

#### 1. Cores não aplicadas no chatbot

**Sintomas**: Cores diferentes do esperado
**Causa**: CSS customizado sobrescrevendo configurações
**Solução**: Verificar `customCSS` em `uiManager.js`

```javascript
// Verificar se está correto
.chatbot-host-bubble {
    background-color: #212529 !important;
}
```

#### 2. Mensagens do bot com cor diferente

**Sintomas**: Fundo das mensagens mais claro
**Causa**: Configuração `botMessage` vs CSS customizado
**Solução**: Alterar ambos os locais

```javascript
// 1. Configuração padrão
botMessage: {
    backgroundColor: '#212529',
}

// 2. CSS customizado
.chatbot-host-bubble {
    background-color: #212529 !important;
}
```

#### 3. Bordas aparecendo nas mensagens

**Sintomas**: Bordas visíveis nas bolhas
**Causa**: CSS não removendo bordas
**Solução**: Adicionar `border: none !important;`

#### 4. Chatbot não inicializa

**Sintomas**: Erro na inicialização
**Causa**: Configuração do Flowise inválida
**Solução**: Verificar `flowiseConfig` no GPT selecionado

### Logs de Debug

```javascript
// Habilitar logs
const DEBUG_MODE = true;

// Logs disponíveis
debugLog('Mensagem de debug');
console.log('Log detalhado');
```

### Verificação de Configuração

```javascript
// Verificar configuração atual
console.log('GPT Config:', this.stateManager.selectedGPT.flowiseConfig);
console.log('Theme Config:', window.flowiseConfig.theme);
```

## Boas Práticas

### 1. Consistência de Cores
- Use a mesma cor para fundo principal e mensagens do bot
- Mantenha contraste adequado (WCAG 2.1 AA)
- Teste em diferentes dispositivos

### 2. Performance
- Use `!important` apenas quando necessário
- Minimize reflows com mudanças de cor
- Cache configurações quando possível

### 3. Manutenibilidade
- Documente alterações de cor
- Use variáveis CSS quando possível
- Mantenha backup das configurações

### 4. Acessibilidade
- Contraste mínimo 4.5:1 para texto normal
- Contraste mínimo 3:1 para texto grande
- Teste com leitores de tela

## Referências

- [Flowise Documentation](https://docs.flowiseai.com/)
- [Bootstrap Colors](https://getbootstrap.com/docs/5.3/customize/color/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

---

**Versão**: 1.0  
**Última atualização**: Dezembro 2024  
**Autor**: Sistema LexiDecis 