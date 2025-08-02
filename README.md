# 🚀 LexiDecis - Sistema de Chat com IA

## 📋 Visão Geral

O **LexiDecis** é uma aplicação web moderna de chat com inteligência artificial, desenvolvida com arquitetura modular e foco em qualidade. O sistema oferece interface intuitiva para interação com múltiplos modelos de IA, gerenciamento de histórico de conversas, autenticação segura e **sistema de presença em tempo real**.

## 🏗️ Arquitetura do Sistema

### **Estrutura Modular**
```
lexidecis/
├── 📁 pages/           # Aplicação principal (chat.html)
├── 📁 admin/           # Painel administrativo com presença em tempo real
├── 📁 chat/            # Módulo de chat (versão alternativa)
├── 📁 services/        # Serviços core da aplicação
├── 📁 tests/           # Sistema completo de testes
├── 📁 docs/            # Documentação técnica completa
└── 📁 instance/        # Instâncias e projetos específicos
```

### **Tecnologias Principais**
- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Módulos)
- **UI Framework**: Bootstrap 5
- **Autenticação**: Firebase Authentication
- **Banco de Dados**: Firebase Firestore (presença em tempo real)
- **Estado**: EventEmitter Pattern
- **Testes**: Framework customizado com TestManager

## 🎯 Funcionalidades Principais

### **Chat com IA**
- ✅ Múltiplos modelos de IA (OpenAI, Gemini, Anthropic, DeepSeek, Groq)
- ✅ Histórico de conversas persistente
- ✅ Interface responsiva e moderna
- ✅ Sistema de loading unificado
- ✅ Tratamento de erros robusto

### **Sistema de Presença em Tempo Real** 🆕
- ✅ **Indicadores de status**: Online, Offline, Desconhecido
- ✅ **Heartbeat automático**: Atualização a cada 30 segundos
- ✅ **Detecção de desconexão**: Marca usuário como offline ao fechar
- ✅ **Sistema de fallback**: Funciona mesmo sem Firebase
- ✅ **Interface visual**: Badges coloridos com animações
- ✅ **Tooltips informativos**: Mostra último acesso

### **Gerenciamento de Estado**
- ✅ StateManager centralizado
- ✅ Persistência de dados
- ✅ Sistema de eventos
- ✅ Gerenciamento de sessão

### **Autenticação e Segurança**
- ✅ Firebase Authentication
- ✅ Guarda de rotas
- ✅ Sessões seguras
- ✅ Controle de acesso

### **Sistema de Testes**
- ✅ Testes unitários
- ✅ Testes de integração
- ✅ Testes end-to-end
- ✅ Testes de performance
- ✅ Framework customizado

## 🚀 Como Executar

### **Pré-requisitos**
- Node.js (versão 14+)
- Navegador moderno com suporte a ES6+
- Servidor HTTP local (para testes)
- **Firebase configurado** (para presença em tempo real)

### **Execução Rápida**
```bash
# 1. Clone o repositório
git clone [url-do-repositorio]

# 2. Navegue para o diretório
cd lexidecis

# 3. Inicie o servidor local
python3 -m http.server 8000

# 4. Acesse a aplicação
open http://localhost:8000/pages/chat.html

# 5. Acesse o painel admin (com presença)
open http://localhost:8000/admin/users.html
```

### **Configuração do Firebase** 🔥
```bash
# 1. Configure as regras do Firestore
# Acesse: https://console.firebase.google.com/
# Projeto: lexidecis → Firestore Database → Rules

# 2. Aplique as regras de presença
# (Ver docs/FIREBASE_PERMISSION_FIX.md)

# 3. Teste o sistema de presença
open http://localhost:8000/tests/presence-fallback-test.html
```

### **Execução dos Testes**
```bash
# Inicie o servidor de testes
python3 -m http.server 8000

# Acesse o índice de testes
open http://localhost:8000/tests/index.html

# Teste específico do sistema de presença
open http://localhost:8000/tests/presence-fallback-test.html

# Ou execute via script
chmod +x tests/chat-app/scripts/run-all-tests.sh
./tests/chat-app/scripts/run-all-tests.sh
```

## 📁 Estrutura Detalhada

### **📂 pages/chat.html** - Aplicação Principal
- **Arquivo**: `pages/chat.html`
- **Descrição**: Interface principal do chat com IA
- **Módulos**: renderer.js, stateManager.js, chatManager.js, uiManager.js, gptManager.js
- **Estilos**: Bootstrap 5 + CSS customizado

### **📂 admin/** - Painel Administrativo 🆕
```
admin/
├── index.html          # Dashboard principal
├── users.html          # Gerenciamento de usuários + Presença em tempo real
├── gpts.html           # Configuração de modelos de IA
├── units.html          # Gerenciamento de unidades
├── assets/
│   ├── css/
│   │   ├── admin.css   # Estilos do admin
│   │   └── presence.css # Estilos dos indicadores de presença
│   └── js/
│       ├── auth.js     # Autenticação + Sistema de presença
│       ├── dom.js      # Manipulação do DOM + Indicadores
│       ├── main.js     # Orquestração + Tracking de presença
│       └── api.js      # Comunicação com APIs
└── tests/
    └── presence-fallback-test.html # Teste do sistema de presença
```

### **📂 services/** - Serviços Core
```
services/
├── stateManager.js      # Gerenciamento de estado centralizado
├── chatManager.js       # Gerenciamento de chats e histórico
├── uiManager.js         # Interface do usuário
├── gptManager.js        # Gerenciamento de modelos de IA
├── apiService.js        # Comunicação com APIs
├── auth.js             # Autenticação Firebase
├── unifiedLoadingManager.js # Sistema de loading
└── renderer.js         # Orquestrador principal
```

### **📂 tests/** - Sistema de Testes
```
tests/
├── index.html          # Índice centralizado de testes
├── presence-fallback-test.html # Teste do sistema de presença
├── chat-app/           # Testes da aplicação principal
│   ├── unit/           # Testes unitários
│   ├── integration/    # Testes de integração
│   ├── e2e/           # Testes end-to-end
│   ├── performance/   # Testes de performance
│   └── utils/         # Utilitários de teste
└── [outros testes existentes]
```

## 🧪 Sistema de Testes

### **Framework Customizado**
- **TestManager**: Orquestração de testes
- **Assert**: Assertions personalizadas
- **MockManager**: Sistema de mocks
- **DOMTestUtils**: Utilitários para DOM
- **TimeUtils**: Utilitários de tempo
- **Logger**: Sistema de logs

### **Categorias de Teste**
1. **Unitários**: Componentes isolados
2. **Integração**: Interação entre módulos
3. **E2E**: Cenários completos
4. **Performance**: Métricas de qualidade
5. **Presença**: Sistema de presença em tempo real 🆕

### **Execução de Testes**
```bash
# Teste específico
open http://localhost:8000/tests/chat-app/unit/services/stateManager.test.html

# Teste do sistema de presença
open http://localhost:8000/tests/presence-fallback-test.html

# Índice completo
open http://localhost:8000/tests/index.html

# Script automatizado
./tests/chat-app/scripts/run-all-tests.sh
```

## 🔧 Configuração e Desenvolvimento

### **Variáveis de Ambiente**
```javascript
// Configurações de API
const API_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
    anthropic: 'https://api.anthropic.com/v1/messages',
    // ... outros endpoints
};

// Configurações Firebase
const FIREBASE_CONFIG = {
    apiKey: "sua-api-key",
    authDomain: "seu-projeto.firebaseapp.com",
    // ... outras configs
};
```

### **Estrutura de Estado**
```javascript
// Estado da aplicação
const appState = {
    session: {
        userId: null,
        sessionId: null,
        isAuthenticated: false
    },
    chat: {
        currentChat: null,
        chatList: [],
        messages: []
    },
    gpt: {
        selectedGPT: null,
        gptList: [],
        isLoading: false
    },
    presence: {  // 🆕 Sistema de presença
        usersOnline: [],
        lastSeen: {},
        heartbeatInterval: null
    }
};
```

## 📊 Monitoramento e Logs

### **Sistema de Logs**
- **Console**: Logs detalhados no console
- **Performance**: Métricas de tempo de resposta
- **Erros**: Captura e tratamento de erros
- **Estado**: Monitoramento de mudanças de estado
- **Presença**: Logs do sistema de presença em tempo real 🆕

### **Métricas Principais**
- Tempo de carregamento da aplicação
- Tempo de resposta das APIs
- Uso de memória
- Taxa de sucesso dos testes
- **Usuários online em tempo real** 🆕

## 🚀 Deploy e Produção

### **Requisitos de Produção**
- Servidor HTTPS
- Configuração de CORS
- Variáveis de ambiente seguras
- Monitoramento de performance
- **Firebase configurado** (para presença)

### **Otimizações**
- Minificação de assets
- Compressão de recursos
- Cache de dados
- Lazy loading
- **Sistema de fallback para presença** 🆕

## 📚 Documentação Adicional

### **Documentos Técnicos**
- [📋 ESTRATEGIA_TESTES.md](tests/chat-app/ESTRATEGIA_TESTES.md) - Estratégia completa de testes
- [📖 README.md](tests/chat-app/README.md) - Documentação dos testes
- [🔧 TECHNICAL_REFERENCE.md](docs/TECHNICAL_REFERENCE.md) - Referência técnica
- [🎨 CHATBOT_COLOR_MANAGEMENT.md](docs/CHATBOT_COLOR_MANAGEMENT.md) - Gerenciamento de cores

### **Sistema de Presença** 🆕
- [👥 PRESENCE_SYSTEM.md](docs/PRESENCE_SYSTEM.md) - Documentação completa do sistema de presença
- [🔧 FIREBASE_PERMISSION_FIX.md](docs/FIREBASE_PERMISSION_FIX.md) - Guia para resolver problemas de permissão
- [🧪 presence-fallback-test.html](tests/presence-fallback-test.html) - Teste do sistema de fallback

### **Guias de Migração**
- [🔄 MIGRATION_GUIDE.md](admin/MIGRATION_GUIDE.md) - Guia de migração
- [📊 MIGRATION_STATUS.md](admin/MIGRATION_STATUS.md) - Status da migração

## 🤝 Contribuição

### **Padrões de Código**
- JavaScript ES6+ com módulos
- CSS com metodologia BEM
- HTML semântico
- Testes para todas as funcionalidades
- **Sistema de presença com fallback** 🆕

### **Fluxo de Desenvolvimento**
1. Crie uma branch para sua feature
2. Implemente a funcionalidade
3. Adicione testes
4. Execute todos os testes
5. **Teste o sistema de presença** 🆕
6. Faça o commit com mensagem descritiva
7. Abra um Pull Request

## 📞 Suporte

### **Canais de Ajuda**
- **Issues**: Reporte bugs e solicite features
- **Documentação**: Consulte os guias técnicos
- **Testes**: Use o sistema de testes para validação
- **Presença**: Use o teste de fallback para diagnosticar problemas 🆕

### **Contatos**
- **Desenvolvedor**: [Seu Nome]
- **Email**: [seu-email@exemplo.com]
- **Projeto**: LexiDecis Chat System

---

## 🎯 Próximos Passos

### **Desenvolvimento Atual**
- ✅ Sistema de testes implementado
- ✅ Documentação organizada
- ✅ Estrutura modular definida
- ✅ **Sistema de presença em tempo real implementado** 🆕

### **Próximas Funcionalidades**
- 🔄 Implementação de testes restantes
- 🔄 Otimizações de performance
- 🔄 Novos modelos de IA
- 🔄 Melhorias na interface
- 🔄 **Status avançado de presença** (Ausente, Ocupado, Não perturbe) 🆕

### **Manutenção**
- 🔄 Atualização de dependências
- 🔄 Monitoramento contínuo
- 🔄 Backup e segurança
- 🔄 **Monitoramento do sistema de presença** 🆕

---

**🧪 LexiDecis** - Sistema de Chat com IA | Versão 1.1 | Criado com ❤️ para qualidade 