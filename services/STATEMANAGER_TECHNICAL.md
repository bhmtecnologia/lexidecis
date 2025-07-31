# 🔧 Documentação Técnica - StateManager v2.0

## 📋 Visão Geral Técnica

Este documento fornece detalhes técnicos sobre a implementação do StateManager refatorado, incluindo arquitetura interna, fluxo de dados, e decisões de design.

## 🏗️ Arquitetura Interna

### Diagrama de Classes

```
EventEmitter (Base)
├── on(event, callback)
├── emit(event, data)
└── off(event, callback)

StateManager (Principal)
├── session: SessionManager
├── chat: ChatManager
├── gpt: GPTManager
├── setupEventPropagation()
└── [Propriedades de Compatibilidade]

SessionManager extends EventEmitter
├── currentSessionId: string
├── setSessionId(sessionId)
├── getSessionId()
├── loadFromStorage()
├── saveToStorage()
└── reset()

ChatManager extends EventEmitter
├── chats: Array
├── setChats(chats)
├── addChat(chat)
├── removeChat(chatId)
├── getChats()
├── getChatById(chatId)
└── reset()

GPTManager extends EventEmitter
├── gpts: Array
├── selectedGPT: Object
├── selectedGPTId: string
├── gptConfig: Object
├── isLoading: boolean
├── isSelectionLoading: boolean
├── setGPTs(gpts)
├── setSelectedGPT(gpt)
├── setGPTConfig(config)
├── setLoading(isLoading)
├── setSelectionLoading(isLoading)
├── getGPTs()
├── getSelectedGPT()
├── getGPTById(gptId)
├── getGPTConfig()
├── getFlowiseConfig()
├── loadSelectedGPT(defaultGPTId, apiService)
├── loadDefaultGPT(defaultGPTId, apiService)
├── loadFromStorage()
├── saveToStorage()
└── reset()
```

### Fluxo de Dados

```
1. Inicialização
   StateManager.constructor()
   ├── new SessionManager()
   ├── new ChatManager()
   ├── new GPTManager()
   └── setupEventPropagation()

2. Operação de Dados
   stateManager.setSelectedGPT(gpt)
   ├── GPTManager.setSelectedGPT(gpt)
   │   ├── validateData(gpt, 'gpt')
   │   ├── this.selectedGPT = gpt
   │   ├── this.selectedGPTId = gpt.id
   │   ├── this.saveToStorage()
   │   └── this.emit('gptSelected', gpt)
   └── StateManager.emit('gptSelected', gpt)

3. Propagação de Eventos
   StateManager.setupEventPropagation()
   ├── session.on('sessionChanged') → StateManager.emit('sessionChanged')
   ├── chat.on('chatAdded') → StateManager.emit('chatAdded')
   └── gpt.on('gptSelected') → StateManager.emit('gptSelected')
```

## 🔍 Detalhes de Implementação

### 1. Sistema de Eventos (EventEmitter)

```javascript
class EventEmitter {
    constructor() {
        this.events = {}; // { eventName: [callback1, callback2, ...] }
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data = null) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    debugLog('EVENTS', `Erro no callback do evento ${event}: ${error.message}`);
                }
            });
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}
```

**Características:**
- Sistema simples e eficiente
- Tratamento de erros nos callbacks
- Não quebra se callback falhar
- Logs automáticos para debug

### 2. Validação de Dados

```javascript
function validateData(data, type, required = true) {
    if (required && !data) {
        throw new Error(`Dados obrigatórios não fornecidos para ${type}`);
    }
    return true;
}

// Uso nos métodos
setSelectedGPT(gpt) {
    validateData(gpt, 'gpt');
    if (!gpt.id) {
        throw new Error('GPT deve ter um ID');
    }
    // ... resto da implementação
}
```

**Benefícios:**
- Falha rápido (fail-fast)
- Mensagens de erro claras
- Previne dados inválidos
- Facilita debug

### 3. Persistência Segura

```javascript
function safeJsonParse(jsonString, defaultValue = null) {
    try {
        return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (error) {
        debugLog('UTILS', `Erro ao fazer parse do JSON: ${error.message}`);
        return defaultValue;
    }
}

function safeJsonStringify(data) {
    try {
        return JSON.stringify(data);
    } catch (error) {
        debugLog('UTILS', `Erro ao serializar dados: ${error.message}`);
        return null;
    }
}
```

**Características:**
- Não quebra se JSON estiver corrompido
- Usa valores padrão em caso de erro
- Logs automáticos para debug
- Fallback seguro

### 4. Propriedades de Compatibilidade

```javascript
// Getters e Setters para compatibilidade
get chats() { return this.chat.getChats(); }
set chats(value) { this.chat.setChats(value); }

get selectedGPT() { return this.gpt.getSelectedGPT(); }
set selectedGPT(value) { this.gpt.setSelectedGPT(value); }

get currentSessionId() { return this.session.getSessionId(); }
set currentSessionId(value) { this.session.setSessionId(value); }
```

**Vantagens:**
- 100% compatibilidade com código existente
- Transparente para o desenvolvedor
- Mantém validação e eventos
- Migração gradual possível

## 📊 Fluxo de Operações

### 1. Inicialização da Aplicação

```javascript
// 1. Criar StateManager
const stateManager = new StateManager();

// 2. Registrar event listeners
stateManager.on('gptSelected', handleGPTSelected);
stateManager.on('chatAdded', handleChatAdded);

// 3. Carregar dados iniciais
await stateManager.loadSelectedGPT('default-gpt', apiService);
stateManager.setChats(await loadChatsFromAPI());

// 4. Verificar estado
if (stateManager.isValidState()) {
    // Aplicação pronta
} else {
    // Precisa configuração
}
```

### 2. Seleção de GPT

```javascript
// 1. Usuário seleciona GPT
stateManager.setSelectedGPT(gpt);

// 2. Fluxo interno
GPTManager.setSelectedGPT(gpt)
├── validateData(gpt, 'gpt')
├── this.selectedGPT = gpt
├── this.selectedGPTId = gpt.id
├── this.saveToStorage()
└── this.emit('gptSelected', gpt)

// 3. Propagação
StateManager.emit('gptSelected', gpt)

// 4. Callbacks executados
handleGPTSelected(gpt) // Atualizar interface
```

### 3. Adição de Chat

```javascript
// 1. Adicionar chat
stateManager.addChat(chat);

// 2. Fluxo interno
ChatManager.addChat(chat)
├── validateData(chat, 'chat')
├── this.chats.push(chat)
└── this.emit('chatAdded', chat)

// 3. Propagação
StateManager.emit('chatAdded', chat)

// 4. Callbacks executados
handleChatAdded(chat) // Atualizar interface
```

## 🔧 Configurações e Personalização

### 1. Habilitar/Desabilitar Logs

```javascript
// No arquivo stateManager.js, linha 11
const DEBUG_MODE = true; // true = logs ativos, false = logs desabilitados
```

### 2. Personalizar Validações

```javascript
function validateData(data, type, required = true) {
    if (required && !data) {
        throw new Error(`Dados obrigatórios não fornecidos para ${type}`);
    }
    
    // Validações customizadas
    switch (type) {
        case 'chat':
            if (data && !data.id) {
                throw new Error('Chat deve ter um ID');
            }
            if (data && !data.name) {
                throw new Error('Chat deve ter um nome');
            }
            break;
            
        case 'gpt':
            if (data && !data.id) {
                throw new Error('GPT deve ter um ID');
            }
            if (data && !data.name) {
                throw new Error('GPT deve ter um nome');
            }
            break;
            
        case 'sessionId':
            if (data && typeof data !== 'string') {
                throw new Error('SessionId deve ser uma string');
            }
            break;
    }
    
    return true;
}
```

### 3. Personalizar Persistência

```javascript
// No SessionManager, ChatManager, GPTManager
saveToStorage() {
    // Personalizar chaves do localStorage
    const storageKey = `lexidecis_${this.constructor.name.toLowerCase()}`;
    const serialized = safeJsonStringify(this.getData());
    if (serialized) {
        localStorage.setItem(storageKey, serialized);
    }
}

loadFromStorage() {
    const storageKey = `lexidecis_${this.constructor.name.toLowerCase()}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        const data = safeJsonParse(stored);
        this.setData(data);
    }
}
```

## 🐛 Debug e Troubleshooting

### 1. Logs Detalhados

```javascript
// Habilitar logs detalhados
stateManager.logCurrentState();

// Verificar eventos registrados
console.log('Eventos registrados:', Object.keys(stateManager.events));

// Verificar estado dos gerenciadores
console.log('SessionManager:', stateManager.session);
console.log('ChatManager:', stateManager.chat);
console.log('GPTManager:', stateManager.gpt);
```

### 2. Debug de Eventos

```javascript
// Adicionar listener para todos os eventos
const allEvents = [
    'sessionChanged', 'sessionReset',
    'chatsUpdated', 'chatAdded', 'chatRemoved', 'chatsReset',
    'gptsUpdated', 'gptSelected', 'gptConfigUpdated',
    'gptLoadingChanged', 'gptSelectionLoadingChanged',
    'gptLoadError', 'gptReset', 'stateReset'
];

allEvents.forEach(event => {
    stateManager.on(event, (data) => {
        console.log(`[DEBUG] Evento ${event}:`, data);
    });
});
```

### 3. Debug de Performance

```javascript
// Medir tempo de operações
const startTime = performance.now();
stateManager.setSelectedGPT(gpt);
const endTime = performance.now();
console.log(`Tempo para selecionar GPT: ${endTime - startTime}ms`);

// Verificar uso de memória
console.log('Tamanho do estado:', JSON.stringify(stateManager.getStateSnapshot()).length);
```

## 🔄 Migração e Compatibilidade

### 1. Compatibilidade Total

O StateManager v2.0 mantém 100% de compatibilidade com o código existente:

```javascript
// Código antigo (continua funcionando)
stateManager.chats.push(chat);
stateManager.selectedGPT = gpt;
stateManager.currentSessionId = sessionId;

// Código novo (opcional)
stateManager.addChat(chat);
stateManager.setSelectedGPT(gpt);
stateManager.setSessionId(sessionId);
```

### 2. Migração Gradual

```javascript
// Fase 1: Usar propriedades de compatibilidade
stateManager.chats = [...]; // Funciona

// Fase 2: Migrar para métodos (quando quiser)
stateManager.setChats([...]); // Melhor

// Fase 3: Usar eventos para reatividade
stateManager.on('chatsUpdated', updateUI);
```

### 3. Verificação de Compatibilidade

```javascript
// Verificar se todos os métodos antigos existem
const requiredMethods = [
    'setSessionId', 'getSessionId', 'loadSelectedChat', 'saveSelectedChat',
    'setChats', 'addChat', 'removeChat', 'getChats', 'getChatById',
    'setGPTs', 'setSelectedGPT', 'setGPTConfig', 'getGPTs', 'getSelectedGPT',
    'getGPTById', 'getGPTConfig', 'getFlowiseConfig', 'loadSelectedGPT',
    'setLoadingGPTs', 'setGPTSelectionLoading', 'isLoadingGPTsActive',
    'isGPTSelectionLoadingActive', 'resetAll', 'getSetting', 'setSetting'
];

const missingMethods = requiredMethods.filter(method => 
    typeof stateManager[method] !== 'function'
);

if (missingMethods.length > 0) {
    console.error('Métodos faltando:', missingMethods);
} else {
    console.log('✅ Compatibilidade total confirmada');
}
```

## 📈 Performance e Otimizações

### 1. Otimizações Implementadas

- **Cópias defensivas**: `getChats()` retorna cópia do array
- **Validação eficiente**: Falha rápido em dados inválidos
- **Eventos otimizados**: Callbacks executados apenas quando necessário
- **Persistência lazy**: Só salva quando dados mudam

### 2. Métricas de Performance

```javascript
// Medir performance de operações
const performanceMetrics = {
    setSelectedGPT: [],
    addChat: [],
    setChats: []
};

// Wrapper para medir performance
function measurePerformance(operation, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    performanceMetrics[operation].push(end - start);
    
    // Log se demorar muito
    if (end - start > 100) {
        console.warn(`Operação ${operation} demorou ${end - start}ms`);
    }
    
    return result;
}

// Uso
measurePerformance('setSelectedGPT', () => {
    stateManager.setSelectedGPT(gpt);
});
```

### 3. Monitoramento de Memória

```javascript
// Verificar uso de memória
function checkMemoryUsage() {
    const snapshot = stateManager.getStateSnapshot();
    const size = JSON.stringify(snapshot).length;
    
    console.log(`Tamanho do estado: ${size} bytes`);
    
    if (size > 1000000) { // 1MB
        console.warn('Estado muito grande, considere limpar dados antigos');
    }
}

// Executar periodicamente
setInterval(checkMemoryUsage, 30000); // A cada 30 segundos
```

## 🔮 Roadmap e Melhorias Futuras

### Versão 2.1 (Próxima)
- [ ] Sistema de cache inteligente
- [ ] Sincronização offline
- [ ] Backup automático
- [ ] Analytics integrado

### Versão 2.2 (Futura)
- [ ] Suporte a múltiplas sessões
- [ ] Sistema de plugins
- [ ] Configurações avançadas
- [ ] Performance monitoring

### Versão 3.0 (Longo prazo)
- [ ] Arquitetura modular completa
- [ ] Suporte a WebWorkers
- [ ] IndexedDB para persistência
- [ ] Sistema de migração automática

## 📞 Suporte Técnico

### Problemas Comuns e Soluções

1. **Erro: "Dados obrigatórios não fornecidos"**
   ```javascript
   // Solução: Verificar dados antes de passar
   if (gpt && gpt.id) {
       stateManager.setSelectedGPT(gpt);
   } else {
       console.error('GPT inválido:', gpt);
   }
   ```

2. **Eventos não disparando**
   ```javascript
   // Solução: Verificar se callback está registrado
   console.log('Eventos registrados:', Object.keys(stateManager.events));
   console.log('Callbacks para gptSelected:', stateManager.events.gptSelected);
   ```

3. **localStorage não funcionando**
   ```javascript
   // Solução: Verificar suporte e permissões
   if (typeof localStorage !== 'undefined') {
       try {
           localStorage.setItem('test', 'test');
           localStorage.removeItem('test');
       } catch (error) {
           console.error('localStorage não disponível:', error);
       }
   }
   ```

### Contato e Suporte

- **Issues**: Use o sistema de issues do repositório
- **Logs**: Consulte os logs do console para debug
- **Documentação**: Este arquivo e o guia principal
- **Exemplos**: Verifique os exemplos de implementação

---

**📄 Versão**: 2.0  
**📅 Última atualização**: Janeiro 2024  
**👨‍💻 Mantido por**: Equipe LexiDecis 