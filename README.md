# LexiDecis - Inteligência Artificial Corporativa

## Visão Geral

O LexiDecis é um sistema de inteligência artificial corporativa que oferece um chat interativo com múltiplos modelos de IA (GPTs). O sistema possui uma arquitetura modular bem estruturada e interface responsiva.

## 🎨 Personalização de Cores do Chatbot

### Documentação Técnica

Para informações detalhadas sobre como personalizar as cores do chatbot Flowise, consulte:

📖 **[Documentação Completa de Gestão de Cores](docs/CHATBOT_COLOR_MANAGEMENT.md)**

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

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
lexidecis/
├── admin/           # Painel administrativo
├── chat/            # Sistema de chat principal
├── docs/            # Documentação técnica
├── instance/        # Instâncias específicas
├── pages/           # Páginas principais
├── services/        # Serviços e gerenciadores
├── styles/          # Arquivos CSS
└── tests/           # Testes automatizados
```

### Componentes Principais

- **UIManager**: Gerencia interface e configurações do chatbot
- **ChatManager**: Gerencia conversas e histórico
- **GPTManager**: Gerencia seleção de modelos de IA
- **StateManager**: Gerencia estado da aplicação
- **ApiService**: Comunicação com APIs externas

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Framework**: Bootstrap 5.3.0
- **Autenticação**: Firebase Auth
- **Banco de Dados**: Firestore
- **APIs**: REST com JWT
- **Chatbot**: Flowise

## 📚 Documentação

### Documentação Técnica

- **[Gestão de Cores do Chatbot](docs/CHATBOT_COLOR_MANAGEMENT.md)** - Guia completo para personalização de cores
- **[Manual de Implementação](MANUAL_IMPLEMENTATION.md)** - Guia de implementação
- **[Sistema de Loading](LOADING_IMPLEMENTATIONS_SUMMARY.md)** - Documentação do sistema de loading

### Documentação por Módulo

- **[Chat](chat/README.md)** - Documentação do módulo de chat
- **[Admin](admin/README.md)** - Documentação do painel administrativo

## 🔧 Configuração

### Pré-requisitos

- Node.js (versão 14+)
- Firebase project configurado
- APIs do Flowise configuradas

### Instalação

1. Clone o repositório
2. Configure as variáveis de ambiente
3. Instale as dependências
4. Execute o projeto

## 🎯 Funcionalidades

- ✅ Chat interativo com múltiplos modelos de IA
- ✅ Interface responsiva para mobile e desktop
- ✅ Sistema de autenticação robusto
- ✅ Gerenciamento de conversas
- ✅ Personalização de cores e temas
- ✅ Sistema de loading unificado
- ✅ Painel administrativo

## 🤝 Contribuição

Para contribuir com o projeto:

1. Leia a documentação técnica
2. Siga os padrões de código estabelecidos
3. Teste suas alterações
4. Documente novas funcionalidades

## 📄 Licença

Este projeto é proprietário da LexiDecis.

---

**Desenvolvido por**: Equipe LexiDecis  
**Última atualização**: Dezembro 2024  
**Versão**: 2.0 