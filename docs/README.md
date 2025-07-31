# Documentação Técnica - LexiDecis

## 📚 Índice da Documentação

### 🎨 Gestão de Cores e Interface

- **[Gestão de Cores do Chatbot](CHATBOT_COLOR_MANAGEMENT.md)** - Guia completo para personalização de cores do chatbot Flowise
- **[Referência Técnica](TECHNICAL_REFERENCE.md)** - Documentação técnica completa para desenvolvedores

### 🔧 Implementação e Configuração

- **[Manual de Implementação](../MANUAL_IMPLEMENTATION.md)** - Guia de implementação do sistema
- **[Sistema de Loading](../LOADING_IMPLEMENTATIONS_SUMMARY.md)** - Documentação do sistema de loading unificado

### 📋 Resumos e Correções

- **[Correção de Loading do Chat](../CHAT_LOADING_CORRECTION.md)** - Correções no sistema de loading
- **[Melhorias de Loading de Mensagens](../MESSAGE_LOADING_IMPROVEMENTS.md)** - Melhorias no sistema de loading
- **[Desabilitar Loading de Mensagens](../MESSAGE_LOADING_DISABLE_FEATURE.md)** - Como desabilitar loading de mensagens
- **[Correção de Clique no Chat](../CHAT_CLICK_LOADING_FIX.md)** - Correções no clique do chat
- **[Atualização de Progresso](../UPDATE_PROGRESS_FIX.md)** - Correções no progresso
- **[Resumo de Loading Unificado](../UNIFIED_LOADING_IMPLEMENTATION_SUMMARY.md)** - Resumo do sistema unificado
- **[Resumo de Logging](../LOGGING_IMPLEMENTATION_SUMMARY.md)** - Sistema de logging
- **[Resumo de Loading Fix](../LOADING_FIX_SUMMARY.md)** - Resumo de correções de loading
- **[Atualização de Spinner para Barra](../SPINNER_TO_BAR_UPDATE.md)** - Mudança de spinner para barra de progresso

## 🎯 Foco Principal: Gestão de Cores do Chatbot

### Documentação Específica

Para informações detalhadas sobre como personalizar as cores do chatbot Flowise, consulte:

📖 **[Gestão de Cores do Chatbot](CHATBOT_COLOR_MANAGEMENT.md)**

### Resumo Rápido

#### Localização das Configurações
- **Arquivo Principal**: `services/uiManager.js`
- **Função**: `initializeChatbot()` (linhas ~315-520)
- **CSS Customizado**: Seção `customCSS` para bolhas de mensagem

#### Cores Principais Configuráveis

| Elemento | Configuração | Localização |
|----------|-------------|-------------|
| Fundo Principal | `chatWindow.backgroundColor` | Linha ~456 |
| Mensagens do Bot | `botMessage.backgroundColor` | Linha ~471 |
| Bolhas de Mensagem | `.chatbot-host-bubble` | CSS Customizado |
| Campo de Entrada | `textInput.backgroundColor` | Linha ~483 |

#### Exemplo de Alteração

```javascript
// Em services/uiManager.js
chatWindow: {
    backgroundColor: '#1a1a1a',        // Fundo principal
    botMessage: {
        backgroundColor: '#2d2d2d',    // Mensagens do bot
    },
    textInput: {
        backgroundColor: '#2d2d2d',    // Campo de entrada
    },
},
customCSS: `
    .chatbot-host-bubble {
        background-color: #2d2d2d !important;  // Bolhas de mensagem
        border: none !important;
    }
`
```

## 🏗️ Estrutura do Projeto

```
lexidecis/
├── docs/                    # 📚 Documentação técnica
│   ├── README.md           # Este arquivo
│   ├── CHATBOT_COLOR_MANAGEMENT.md
│   └── TECHNICAL_REFERENCE.md
├── services/               # 🔧 Serviços e lógica
├── styles/                 # 🎨 Estilos CSS
├── pages/                  # 📄 Páginas principais
├── admin/                  # ⚙️ Painel administrativo
├── chat/                   # 💬 Sistema de chat
└── instance/               # 🏢 Instâncias específicas
```

## 🚀 Como Usar

1. **Para personalizar cores**: Consulte [Gestão de Cores do Chatbot](CHATBOT_COLOR_MANAGEMENT.md)
2. **Para desenvolvimento**: Consulte [Referência Técnica](TECHNICAL_REFERENCE.md)
3. **Para implementação**: Consulte [Manual de Implementação](../MANUAL_IMPLEMENTATION.md)

## 📞 Suporte

Para dúvidas técnicas ou problemas com a documentação:

1. Verifique a seção de troubleshooting nos documentos
2. Consulte os exemplos de código fornecidos
3. Verifique se está usando a versão correta dos arquivos

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0  
**Autor**: Sistema LexiDecis 