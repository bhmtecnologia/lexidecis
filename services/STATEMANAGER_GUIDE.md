# 📚 Guia Completo do StateManager Refatorado

## 📋 Visão Geral

O StateManager foi completamente refatorado seguindo as melhores práticas, mantendo a simplicidade e facilitando a manutenção. A versão 2.0 introduz melhorias significativas sem quebrar a compatibilidade com o código existente.

### ✨ Principais Melhorias

1. **Separação de Responsabilidades** - Cada tipo de dado tem seu próprio gerenciador
2. **Sistema de Eventos** - Componentes são notificados quando algo muda
3. **Validação de Dados** - Verifica se os dados estão corretos antes de salvar
4. **Logs Sempre Ativos** - Facilita debug em produção
5. **Tratamento de Erros Robusto** - Não quebra a aplicação se algo der errado
6. **100% Compatibilidade** - Funciona com o código existente sem modificações

## 🏗️ Arquitetura

```
StateManager (Principal)
├── SessionManager (gerencia sessões)
├── ChatManager (gerencia chats)
└── GPTManager (gerencia GPTs)
    └── EventEmitter (sistema de eventos)
```

### Componentes

- **StateManager**: Coordena todos os gerenciadores e mantém compatibilidade
- **SessionManager**: Gerencia sessões ativas e persistência
- **ChatManager**: Gerencia lista de chats e operações
- **GPTManager**: Gerencia GPTs, seleção e configurações
- **EventEmitter**: Sistema de eventos simples e eficiente

## 🚀 Inicialização e Uso Básico

### 1. Importação e Criação

```javascript
import StateManager from './services/stateManager.js';

const stateManager = new StateManager();
```

### 2. Sistema de Eventos

```javascript
// Escutar mudanças de chat
stateManager.on('chatAdded', (chat) => {
    console.log('Novo chat adicionado:', chat);
    updateChatList(); // Atualizar interface
});

// Escutar mudanças de GPT
stateManager.on('gptSelected', (gpt) => {
    console.log('GPT selecionado:', gpt);
    updateGPTDisplay(gpt); // Atualizar interface
});

// Escutar erros
stateManager.on('gptLoadError', (error) => {
    console.error('Erro ao carregar GPT:', error);
    showErrorMessage(error.message);
});
```

## 📝 API Completa

### 🔧 Métodos Principais

#### Sessões
```javascript
// Definir sessão ativa
stateManager.setSessionId('chat123');

// Obter sessão atual
const sessionId = stateManager.getSessionId();

// Carregar chat selecionado (compatibilidade)
stateManager.loadSelectedChat();

// Salvar chat selecionado (compatibilidade)
stateManager.saveSelectedChat('chat123');
```

#### Chats
```javascript
// Definir lista completa
stateManager.setChats([
    { id: 'chat1', name: 'Conversa 1' },
    { id: 'chat2', name: 'Conversa 2' }
]);

// Adicionar chat individual
stateManager.addChat({ id: 'chat3', name: 'Nova Conversa' });

// Remover chat
stateManager.removeChat('chat1');

// Obter todos os chats
const chats = stateManager.getChats();

// Obter chat específico
const chat = stateManager.getChatById('chat2');
```

#### GPTs
```javascript
// Definir lista de GPTs
stateManager.setGPTs([
    { id: 'gpt1', name: 'OpenAI' },
    { id: 'gpt2', name: 'Gemini' }
]);

// Selecionar GPT
stateManager.setSelectedGPT({ id: 'gpt1', name: 'OpenAI' });

// Definir configurações
stateManager.setGPTConfig({
    flowise: { chatflowId: 'abc123' }
});

// Carregar GPT da API
await stateManager.loadSelectedGPT('gpt1', apiService);

// Obter dados
const gpts = stateManager.getGPTs();
const selectedGPT = stateManager.getSelectedGPT();
const config = stateManager.getGPTConfig();
const flowiseConfig = stateManager.getFlowiseConfig();
```

#### Estados de Carregamento
```javascript
// Definir loading
stateManager.setLoadingGPTs(true);
stateManager.setGPTSelectionLoading(true);

// Verificar estados
if (stateManager.isLoadingGPTsActive()) {
    console.log('Carregando GPTs...');
}

if (stateManager.isGPTSelectionLoadingActive()) {
    console.log('Selecionando GPT...');
}
```

#### Configurações
```javascript
// Definir configuração
stateManager.setSetting('theme', 'dark');
stateManager.setSetting('notifications', true);

// Obter configuração
const theme = stateManager.getSetting('theme', 'light');
const notifications = stateManager.getSetting('notifications', false);
```

### 🔄 Propriedades de Compatibilidade

O StateManager mantém compatibilidade total com o código existente através de getters/setters:

```javascript
// Acesso direto às propriedades (compatibilidade)
stateManager.chats = [...]; // Equivale a setChats([...])
const chats = stateManager.chats; // Equivale a getChats()

stateManager.selectedGPT = gpt; // Equivale a setSelectedGPT(gpt)
const gpt = stateManager.selectedGPT; // Equivale a getSelectedGPT()

stateManager.currentSessionId = 'chat123'; // Equivale a setSessionId('chat123')
const sessionId = stateManager.currentSessionId; // Equivale a getSessionId()

// Outras propriedades
stateManager.selectedGPTId = 'gpt1';
stateManager.gptConfig = config;
stateManager.isLoadingGPTs = true;
stateManager.isGPTSelectionLoading = false;
stateManager.selectedChat = chat;
```

## 📡 Sistema de Eventos

### Eventos Disponíveis

#### Sessão
- `sessionChanged` - Sessão mudou
- `sessionReset` - Sessão foi resetada

#### Chats
- `chatsUpdated` - Lista de chats atualizada
- `chatAdded` - Chat adicionado
- `chatRemoved` - Chat removido
- `chatsReset` - Chats resetados

#### GPTs
- `gptsUpdated` - Lista de GPTs atualizada
- `gptSelected` - GPT selecionado
- `gptConfigUpdated` - Configuração atualizada
- `gptLoadingChanged` - Loading de GPTs mudou
- `gptSelectionLoadingChanged` - Loading de seleção mudou
- `gptLoadError` - Erro ao carregar GPT
- `gptReset` - GPTs resetados

#### Geral
- `stateReset` - Estado completo resetado

### Exemplo de Uso de Eventos

```javascript
class ChatInterface {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Atualizar lista de chats
        this.stateManager.on('chatsUpdated', (chats) => {
            this.updateChatList(chats);
        });

        this.stateManager.on('chatAdded', (chat) => {
            this.addChatToUI(chat);
        });

        this.stateManager.on('chatRemoved', (chatId) => {
            this.removeChatFromUI(chatId);
        });

        // Atualizar interface do GPT
        this.stateManager.on('gptSelected', (gpt) => {
            this.updateGPTDisplay(gpt);
        });

        this.stateManager.on('gptLoadingChanged', (isLoading) => {
            this.showLoadingSpinner(isLoading);
        });

        // Tratar erros
        this.stateManager.on('gptLoadError', (error) => {
            this.showErrorMessage(error.message);
        });
    }

    updateChatList(chats) {
        // Implementar atualização da interface
    }

    addChatToUI(chat) {
        // Implementar adição de chat na interface
    }

    removeChatFromUI(chatId) {
        // Implementar remoção de chat da interface
    }

    updateGPTDisplay(gpt) {
        // Implementar atualização do display do GPT
    }

    showLoadingSpinner(isLoading) {
        // Implementar exibição/ocultação do spinner
    }

    showErrorMessage(message) {
        // Implementar exibição de erro
    }
}
```

## 🔧 Métodos de Utilidade

### Verificação de Estado

```javascript
// Verificar se o estado é válido
if (stateManager.isValidState()) {
    console.log('Estado OK - Aplicação pronta');
} else {
    console.log('Estado inválido - Precisa inicializar');
}

// Obter snapshot completo do estado
const snapshot = stateManager.getStateSnapshot();
console.log('Estado atual:', snapshot);

// Logar estado para debug
stateManager.logCurrentState();
```

### Reset e Limpeza

```javascript
// Resetar tudo
stateManager.resetAll();

// Escutar reset
stateManager.on('stateReset', () => {
    console.log('Estado resetado - Limpar interface');
    clearAllUI();
});
```

## 🐛 Debug e Logs

### Logs Automáticos

O StateManager loga automaticamente todas as operações com timestamp e contexto:

```
[2024-01-15T10:30:00.000Z] [StateManager:MAIN] StateManager inicializado
[2024-01-15T10:30:01.000Z] [StateManager:GPT] GPTs atualizados: 3 GPTs
[2024-01-15T10:30:02.000Z] [StateManager:GPT] GPT selecionado: gpt1
[2024-01-15T10:30:03.000Z] [StateManager:CHAT] Chats atualizados: 5 chats
[2024-01-15T10:30:04.000Z] [StateManager:CHAT] Chat adicionado: chat123
[2024-01-15T10:30:05.000Z] [StateManager:SESSION] Sessão definida: chat123
```

### Debug Manual

```javascript
// Logar estado completo
stateManager.logCurrentState();

// Verificar se é válido
console.log('Estado válido:', stateManager.isValidState());

// Obter snapshot detalhado
const snapshot = stateManager.getStateSnapshot();
console.log('Snapshot completo:', snapshot);
```

## ⚠️ Tratamento de Erros

### Validação Automática

```javascript
// Se dados inválidos forem fornecidos
try {
    stateManager.addChat(null); // Vai lançar erro
} catch (error) {
    console.error('Erro:', error.message);
    // "Dados obrigatórios não fornecidos para chat"
}

try {
    stateManager.setSelectedGPT({}); // Vai lançar erro
} catch (error) {
    console.error('Erro:', error.message);
    // "GPT deve ter um ID"
}
```

### Tratamento de JSON Corrompido

```javascript
// Se localStorage estiver corrompido
// O StateManager vai usar valores padrão automaticamente
// e logar o erro para debug

// Exemplo de log:
// [StateManager:UTILS] Erro ao fazer parse do JSON: Unexpected token
```

### Tratamento de Erros de API

```javascript
// Escutar erros de carregamento
stateManager.on('gptLoadError', (error) => {
    console.error('Erro ao carregar GPT:', error);
    
    // Mostrar mensagem para o usuário
    showUserMessage('Erro ao carregar modelo de IA. Tente novamente.');
    
    // Tentar carregar GPT padrão
    loadDefaultGPT();
});
```

## 🔄 Migração do Código Antigo

### Antes (Código Antigo)

```javascript
// Acesso direto às propriedades
stateManager.chats.push(chat);
stateManager.selectedGPT = gpt;
stateManager.currentSessionId = sessionId;

// localStorage manual
localStorage.setItem('selectedGPT', JSON.stringify(gpt));
localStorage.setItem('selectedChatId', chatId);

// Sem validação
stateManager.gptConfig = config;

// Sem eventos
// Interface não é atualizada automaticamente
```

### Depois (Código Novo - Opcional)

```javascript
// Métodos com validação e eventos
stateManager.addChat(chat); // Valida e emite evento
stateManager.setSelectedGPT(gpt); // Valida, salva e emite evento
stateManager.setSessionId(sessionId); // Valida, salva e emite evento

// Configurações com validação
stateManager.setGPTConfig(config); // Valida e emite evento

// Interface atualizada automaticamente via eventos
```

### Migração Gradual

```javascript
// Você pode migrar gradualmente
// O código antigo continua funcionando

// Antes
stateManager.chats.push(chat);

// Depois (quando quiser)
stateManager.addChat(chat);

// Ambos funcionam!
```

## 📋 Exemplo Completo de Implementação

```javascript
import StateManager from './services/stateManager.js';

class LexiDecisApp {
    constructor() {
        this.stateManager = new StateManager();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Eventos de chat
        this.stateManager.on('chatsUpdated', this.handleChatsUpdated.bind(this));
        this.stateManager.on('chatAdded', this.handleChatAdded.bind(this));
        this.stateManager.on('chatRemoved', this.handleChatRemoved.bind(this));
        
        // Eventos de GPT
        this.stateManager.on('gptSelected', this.handleGPTSelected.bind(this));
        this.stateManager.on('gptLoadingChanged', this.handleGPTLoading.bind(this));
        this.stateManager.on('gptLoadError', this.handleGPTError.bind(this));
        
        // Eventos de sessão
        this.stateManager.on('sessionChanged', this.handleSessionChanged.bind(this));
        
        // Eventos gerais
        this.stateManager.on('stateReset', this.handleStateReset.bind(this));
    }

    async initialize() {
        try {
            console.log('Inicializando LexiDecis...');
            
            // Carregar GPT padrão
            await this.stateManager.loadSelectedGPT('default-gpt', this.apiService);
            
            // Carregar chats da API
            const chats = await this.loadChatsFromAPI();
            this.stateManager.setChats(chats);
            
            // Verificar estado
            if (this.stateManager.isValidState()) {
                console.log('✅ Aplicação inicializada com sucesso');
                this.showMainInterface();
            } else {
                console.log('⚠️ Estado inválido - Precisa configuração');
                this.showSetupInterface();
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            this.showErrorInterface(error);
        }
    }

    // Handlers de eventos
    handleChatsUpdated(chats) {
        this.updateChatList(chats);
    }

    handleChatAdded(chat) {
        this.addChatToUI(chat);
        this.showNotification(`Chat "${chat.name}" adicionado`);
    }

    handleChatRemoved(chatId) {
        this.removeChatFromUI(chatId);
        this.showNotification('Chat removido');
    }

    handleGPTSelected(gpt) {
        this.updateGPTDisplay(gpt);
        this.showNotification(`GPT "${gpt.name}" selecionado`);
    }

    handleGPTLoading(isLoading) {
        this.showLoadingSpinner(isLoading);
    }

    handleGPTError(error) {
        this.showErrorMessage(`Erro ao carregar GPT: ${error.message}`);
    }

    handleSessionChanged(sessionId) {
        this.loadChat(sessionId);
    }

    handleStateReset() {
        this.clearAllUI();
        this.showMainInterface();
    }

    // Métodos de interface (implementar conforme necessário)
    updateChatList(chats) {
        // Implementar atualização da lista de chats
    }

    addChatToUI(chat) {
        // Implementar adição de chat na interface
    }

    removeChatFromUI(chatId) {
        // Implementar remoção de chat da interface
    }

    updateGPTDisplay(gpt) {
        // Implementar atualização do display do GPT
    }

    showLoadingSpinner(isLoading) {
        // Implementar exibição/ocultação do spinner
    }

    showNotification(message) {
        // Implementar exibição de notificação
    }

    showErrorMessage(message) {
        // Implementar exibição de erro
    }

    showMainInterface() {
        // Implementar exibição da interface principal
    }

    showSetupInterface() {
        // Implementar exibição da interface de configuração
    }

    showErrorInterface(error) {
        // Implementar exibição da interface de erro
    }

    clearAllUI() {
        // Implementar limpeza da interface
    }

    loadChat(sessionId) {
        // Implementar carregamento de chat
    }

    async loadChatsFromAPI() {
        // Implementar carregamento de chats da API
        return [];
    }
}

// Uso
const app = new LexiDecisApp();
app.initialize();
```

## 🎯 Benefícios da Refatoração

### Para Desenvolvedores
1. **Manutenção Mais Fácil** - Código organizado e bem documentado
2. **Menos Bugs** - Validação automática de dados
3. **Debug Melhor** - Logs sempre ativos e detalhados
4. **Código Mais Limpo** - Responsabilidades bem definidas
5. **Menos Dependências** - Não precisa de bibliotecas externas

### Para Usuários
1. **Interface Reativa** - Atualizações automáticas
2. **Melhor Performance** - Menos bugs e operações otimizadas
3. **Experiência Consistente** - Comportamento previsível
4. **Recuperação de Erros** - Aplicação não quebra facilmente

### Para o Projeto
1. **Compatibilidade Total** - Não quebra código existente
2. **Escalabilidade** - Fácil adicionar novas funcionalidades
3. **Testabilidade** - Código mais fácil de testar
4. **Documentação Completa** - Fácil para novos desenvolvedores

## 🔧 Configuração e Personalização

### Habilitar/Desabilitar Logs

```javascript
// No arquivo stateManager.js, linha 11
const DEBUG_MODE = true; // true = logs ativos, false = logs desabilitados
```

### Personalizar Validações

```javascript
// No arquivo stateManager.js, função validateData
function validateData(data, type, required = true) {
    if (required && !data) {
        throw new Error(`Dados obrigatórios não fornecidos para ${type}`);
    }
    
    // Adicionar validações customizadas aqui
    if (type === 'chat' && data && !data.id) {
        throw new Error('Chat deve ter um ID');
    }
    
    return true;
}
```

## 📞 Suporte e Troubleshooting

### Problemas Comuns

1. **Erro: "Dados obrigatórios não fornecidos"**
   - Verifique se está passando dados válidos
   - Use `console.log()` para debugar os dados

2. **Eventos não disparando**
   - Verifique se o callback está registrado corretamente
   - Confirme se o evento está sendo emitido (logs)

3. **localStorage não funcionando**
   - Verifique se o navegador suporta localStorage
   - Confirme se não está em modo privado

4. **Performance lenta**
   - Verifique se não há loops infinitos nos callbacks
   - Use `stateManager.logCurrentState()` para debug

### Logs de Debug

```javascript
// Habilitar logs detalhados
stateManager.logCurrentState();

// Verificar eventos registrados
console.log('Eventos:', stateManager.events);

// Verificar estado atual
console.log('Estado:', stateManager.getStateSnapshot());
```

---

## 📄 Versão e Changelog

### Versão 2.0 (Atual)
- ✅ Refatoração completa com separação de responsabilidades
- ✅ Sistema de eventos integrado
- ✅ Validação automática de dados
- ✅ Logs sempre ativos para debug
- ✅ 100% compatibilidade com código existente
- ✅ Tratamento robusto de erros
- ✅ Documentação completa

### Próximas Versões
- 🔄 Sistema de cache inteligente
- 🔄 Sincronização offline
- 🔄 Backup automático
- 🔄 Analytics integrado

---

**📧 Para dúvidas ou sugestões:** Consulte os logs do console ou adicione issues no repositório. 