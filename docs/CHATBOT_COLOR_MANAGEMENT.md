# Gestão de Cores do Chatbot Flowise

## Visão Geral

Este documento descreve como gerenciar e personalizar as cores do chatbot Flowise no sistema LexiDecis. As configurações de cor são aplicadas através do `UIManager` e afetam tanto o tema principal quanto elementos específicos como as mensagens do bot.

## Arquivos Principais

### 1. Configuração Principal
- **Arquivo**: `services/uiManager.js`
- **Função**: `initializeChatbot()`
- **Linha**: ~315-520

### 2. Variáveis CSS Globais
- **Arquivo**: `styles/chat.css`
- **Seção**: `:root` (linhas 21-89)

## Estrutura de Configuração

### Tema Principal do Chatbot

```javascript
theme: {
    button: {
        backgroundColor: '#212529',
        right: 20,
        bottom: 20,
        size: 48,
        dragAndDrop: true,
        iconColor: 'white',
        customIconSrc: '...',
    },
    disclaimer: {
        title: 'Aviso',
        message: '...',
        textColor: 'black',
        buttonColor: '#212529',
        buttonText: 'Concordo, quero iniciar o LexiDecis',
        buttonTextColor: 'white',
        blurredBackgroundColor: 'rgba(0, 0, 0, 0.4)',
        backgroundColor: 'white',
    },
    customCSS: `...`,
    chatWindow: {
        // Configurações da janela do chat
    }
}
```

### Configurações da Janela do Chat

```javascript
chatWindow: {
    showTitle: true,
    showAgentMessages: true,
    title: '...',
    titleBackgroundColor: '#212529',
    titleAvatarSrc: '...',
    welcomeMessage: '...',
    errorMessage: '...',
    backgroundColor: '#212529',        // ← FUNDO PRINCIPAL
    fontSize: 13,
    botMessage: {
        backgroundColor: '#212529',    // ← FUNDO DAS MENSAGENS DO BOT
        textColor: '#ffffff',
        showAvatar: false,
    },
    userMessage: {
        backgroundColor: '#343a40',    // ← FUNDO DAS MENSAGENS DO USUÁRIO
        textColor: '#ffffff',
        showAvatar: false,
    },
    textInput: {
        placeholder: 'Mensagem...',
        backgroundColor: '#212529',    // ← FUNDO DO CAMPO DE ENTRADA
        textColor: '#ffffff',
        sendButtonColor: '#ffffff',
        maxChars: 100000,
        autoFocus: true,
        sendMessageSound: true,
        receiveMessageSound: true,
    },
    feedback: {
        color: '#212529',
    },
    footer: {
        textColor: '#ffffff',
        text: 'O LexiDecis pode cometer erros. Sempre verifique as respostas - ',
        company: 'LexiDecis',
        companyLink: 'https://lexidecis.com.br',
    },
}
```

## CSS Customizado para Mensagens do Bot

### ⚠️ IMPORTANTE: Configuração das Bolhas de Mensagem

As mensagens do bot são estilizadas através de CSS customizado que sobrescreve as configurações padrão:

```javascript
customCSS: `
    /* Estilo para mensagens do bot (BOLHAS) */
    .chatbot-host-bubble {
        background-color: #212529 !important;  // ← COR DAS MENSAGENS DO BOT
        color: #ffffff !important;
        border: none !important;               // ← BORDA REMOVIDA
    }
    
    .chatbot-host-bubble:hover {
        background-color: #343a40 !important;  // ← COR NO HOVER
    }
    
    /* Outros estilos... */
`
```

## Como Alterar as Cores

### 1. Alterar Cor de Fundo Principal

**Localização**: `services/uiManager.js` linha ~456

```javascript
// Antes
backgroundColor: '#212529',

// Depois
backgroundColor: '#1a1a1a',  // Exemplo: preto mais escuro
```

### 2. Alterar Cor das Mensagens do Bot

**Localização**: `services/uiManager.js` linha ~471

```javascript
// Antes
botMessage: {
    backgroundColor: '#212529',
    textColor: '#ffffff',
    showAvatar: false,
},

// Depois
botMessage: {
    backgroundColor: '#2d2d2d',  // Exemplo: cinza escuro
    textColor: '#ffffff',
    showAvatar: false,
},
```

### 3. Alterar Cor das Bolhas de Mensagem (CSS Customizado)

**Localização**: `services/uiManager.js` linha ~415

```javascript
// Antes
.chatbot-host-bubble {
    background-color: #212529 !important;
    color: #ffffff !important;
    border: none !important;
}

// Depois
.chatbot-host-bubble {
    background-color: #2d2d2d !important;  // Exemplo: cinza escuro
    color: #ffffff !important;
    border: none !important;
}
```

### 4. Alterar Cor do Campo de Entrada

**Localização**: `services/uiManager.js` linha ~483

```javascript
// Antes
textInput: {
    backgroundColor: '#212529',
    textColor: '#ffffff',
    // ...
},

// Depois
textInput: {
    backgroundColor: '#2d2d2d',  // Exemplo: cinza escuro
    textColor: '#ffffff',
    // ...
},
```

## Paleta de Cores Padrão

### Cores Atuais do Sistema

| Elemento | Cor | Descrição |
|----------|-----|-----------|
| Fundo Principal | `#212529` | Cinza escuro (Bootstrap bg-dark) |
| Mensagens do Bot | `#212529` | Mesma cor do fundo |
| Mensagens do Usuário | `#343a40` | Cinza médio |
| Campo de Entrada | `#212529` | Mesma cor do fundo |
| Hover das Bolhas | `#343a40` | Cinza médio |
| Texto | `#ffffff` | Branco |

### Cores Alternativas Sugeridas

| Tema | Fundo Principal | Mensagens Bot | Mensagens User | Campo Entrada |
|------|----------------|---------------|----------------|---------------|
| Escuro | `#1a1a1a` | `#2d2d2d` | `#404040` | `#2d2d2d` |
| Azul Escuro | `#1e3a8a` | `#2563eb` | `#3b82f6` | `#2563eb` |
| Verde Escuro | `#064e3b` | `#047857` | `#059669` | `#047857` |
| Roxo Escuro | `#581c87` | `#7c3aed` | `#8b5cf6` | `#7c3aed` |

## Exemplo de Implementação

### Tema Escuro Personalizado

```javascript
chatWindow: {
    backgroundColor: '#1a1a1a',
    botMessage: {
        backgroundColor: '#2d2d2d',
        textColor: '#ffffff',
        showAvatar: false,
    },
    userMessage: {
        backgroundColor: '#404040',
        textColor: '#ffffff',
        showAvatar: false,
    },
    textInput: {
        backgroundColor: '#2d2d2d',
        textColor: '#ffffff',
        sendButtonColor: '#ffffff',
    },
},
customCSS: `
    .chatbot-host-bubble {
        background-color: #2d2d2d !important;
        color: #ffffff !important;
        border: none !important;
    }
    
    .chatbot-host-bubble:hover {
        background-color: #404040 !important;
    }
`
```

## Troubleshooting

### Problema: Cores não estão sendo aplicadas

**Solução**: Verificar se as alterações foram feitas em ambos os locais:
1. Configuração `botMessage.backgroundColor`
2. CSS customizado `.chatbot-host-bubble`

### Problema: Mensagens do bot com cor diferente

**Causa**: O CSS customizado sobrescreve a configuração padrão
**Solução**: Alterar a cor no `customCSS` para `.chatbot-host-bubble`

### Problema: Bordas aparecendo nas mensagens

**Solução**: Verificar se `border: none !important;` está definido no CSS customizado

## Boas Práticas

1. **Consistência**: Use a mesma cor para fundo principal e mensagens do bot
2. **Contraste**: Mantenha contraste adequado entre fundo e texto
3. **Acessibilidade**: Use cores que atendam aos padrões WCAG
4. **Teste**: Sempre teste as alterações em diferentes dispositivos

## Referências

- [Bootstrap Colors](https://getbootstrap.com/docs/5.3/customize/color/)
- [Flowise Documentation](https://docs.flowiseai.com/)
- [WCAG Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0  
**Autor**: Sistema LexiDecis 