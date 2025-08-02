# 🎯 Melhores Práticas - LexiDecis

## 📋 Índice

1. [Padrões de Código](#padrões-de-código)
2. [Arquitetura](#arquitetura)
3. [Sistema de Presença](#sistema-de-presença)
4. [Testes](#testes)
5. [Performance](#performance)
6. [Segurança](#segurança)
7. [Documentação](#documentação)
8. [Debugging](#debugging)

## 📝 Padrões de Código

### **JavaScript ES6+**

#### **Imports/Exports**
```javascript
// ✅ Correto
import { auth, db } from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export { AuthService };
export function updateUserPresence(userId, presence) { }

// ❌ Evitar
const auth = require("./firebase.js");
module.exports = AuthService;
```

#### **Async/Await**
```javascript
// ✅ Correto
async function handleUserAction() {
    try {
        const result = await apiCall();
        return result;
    } catch (error) {
        console.error('[Context] ❌ Erro:', error);
        throw error;
    }
}

// ❌ Evitar
function handleUserAction() {
    apiCall().then(result => {
        return result;
    }).catch(error => {
        console.error(error);
    });
}
```

#### **Arrow Functions**
```javascript
// ✅ Correto
const updateUI = (data) => {
    // Lógica de atualização
};

const handleClick = async (event) => {
    event.preventDefault();
    await processData();
};

// ❌ Evitar
function updateUI(data) {
    // Lógica de atualização
}
```

### **Tratamento de Erros**

#### **Padrão de Try/Catch**
```javascript
// ✅ Correto
async function riskyOperation() {
    try {
        const result = await firebaseOperation();
        console.log('[Module] ✅ Operação bem-sucedida');
        return result;
    } catch (error) {
        console.error('[Module] ❌ Erro crítico:', error);
        
        // Fallback específico
        if (error.code === 'permission-denied') {
            return useLocalFallback();
        }
        
        // Re-throw para tratamento superior
        throw error;
    }
}
```

#### **Logging Estruturado**
```javascript
// ✅ Correto
console.log('[AuthService] 🔄 Iniciando tracking de presença');
console.warn('[AuthService] ⚠️ Fallback ativado');
console.error('[AuthService] ❌ Erro de permissão:', error);

// ❌ Evitar
console.log('Erro aqui');
console.error(error);
```

### **CSS (BEM Methodology)**

#### **Estrutura BEM**
```css
/* ✅ Correto */
.presence-badge { }
.presence-badge__indicator { }
.presence-badge--online { }
.presence-badge--offline { }

/* ❌ Evitar */
.presence-badge-indicator { }
.presence-badge-online { }
```

#### **Organização de Estilos**
```css
/* ✅ Correto - Agrupar por funcionalidade */
/* ===== PRESENCE SYSTEM ===== */
.presence-badge { }
.presence-indicator { }
.presence-tooltip { }

/* ===== ANIMATIONS ===== */
@keyframes pulse { }
@keyframes fadeIn { }
```

## 🏗️ Arquitetura

### **Separação de Responsabilidades**

#### **Estrutura de Módulos**
```javascript
// ✅ Correto - Cada arquivo tem uma responsabilidade clara
├── auth.js          # Autenticação e presença
├── dom.js           # Manipulação do DOM
├── main.js          # Orquestração
├── api.js           # Comunicação com APIs
└── firebase.js      # Configuração Firebase
```

#### **Padrão de Eventos**
```javascript
// ✅ Correto - Usar eventos customizados
document.addEventListener('presenceChanged', (event) => {
    const { uid, presence } = event.detail;
    updateUserPresence(uid, presence);
});

// Disparar eventos
document.dispatchEvent(new CustomEvent("presenceChanged", {
    detail: { uid, presence }
}));
```

### **Gerenciamento de Estado**

#### **Estado Centralizado**
```javascript
// ✅ Correto - Estado centralizado e imutável
const appState = {
    session: {
        userId: null,
        isAuthenticated: false
    },
    presence: {
        usersOnline: [],
        lastSeen: {},
        heartbeatInterval: null
    }
};

// Atualizar estado
function updateState(newState) {
    Object.assign(appState, newState);
    notifyObservers();
}
```

## 👥 Sistema de Presença

### **Padrões Específicos**

#### **Heartbeat Management**
```javascript
// ✅ Correto - Gerenciar intervalos adequadamente
class PresenceManager {
    constructor() {
        this.interval = null;
    }
    
    startHeartbeat(user) {
        this.stopHeartbeat(); // Limpar anterior
        this.interval = setInterval(async () => {
            try {
                await this.updatePresence(user);
            } catch (error) {
                console.error('[Presence] ❌ Erro no heartbeat:', error);
            }
        }, 30000);
    }
    
    stopHeartbeat() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
```

#### **Fallback Strategy**
```javascript
// ✅ Correto - Sistema de fallback robusto
async function getUsersPresence(userIds) {
    try {
        return await firebasePresence(userIds);
    } catch (error) {
        console.warn('[Presence] ⚠️ Firebase falhou, usando fallback');
        return localPresenceFallback(userIds);
    }
}
```

#### **Cleanup Resources**
```javascript
// ✅ Correto - Limpar recursos adequadamente
window.addEventListener('beforeunload', () => {
    if (presenceUnsubscribe) {
        presenceUnsubscribe();
    }
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
});
```

## 🧪 Testes

### **Estrutura de Testes**

#### **Organização**
```javascript
// ✅ Correto - Testes organizados e descritivos
describe('Presence System', () => {
    beforeEach(() => {
        // Setup
        clearLocalStorage();
        mockFirebase();
    });
    
    afterEach(() => {
        // Cleanup
        cleanup();
    });
    
    test('should update user presence when online', async () => {
        // Arrange
        const userId = 'test-user';
        const presence = { online: true };
        
        // Act
        await updateUserPresence(userId, presence);
        
        // Assert
        expect(getPresenceStatus(userId)).toContain('Online');
    });
});
```

#### **Mocks e Stubs**
```javascript
// ✅ Correto - Usar mocks para dependências externas
const mockFirebase = {
    auth: {
        currentUser: { uid: 'test-user' }
    },
    firestore: {
        doc: jest.fn(),
        setDoc: jest.fn().mockResolvedValue()
    }
};
```

### **Cobertura de Testes**

#### **Cenários Importantes**
- ✅ Autenticação de usuários
- ✅ Sistema de presença
- ✅ Fallback local
- ✅ Tratamento de erros
- ✅ Cleanup de recursos

## ⚡ Performance

### **Otimizações**

#### **Debounce e Throttle**
```javascript
// ✅ Correto - Evitar chamadas excessivas
const debouncedUpdate = debounce(updatePresence, 1000);
const throttledHeartbeat = throttle(sendHeartbeat, 30000);
```

#### **Lazy Loading**
```javascript
// ✅ Correto - Carregar recursos sob demanda
async function loadPresenceData() {
    if (!presenceDataLoaded) {
        const data = await fetchPresenceData();
        cachePresenceData(data);
        presenceDataLoaded = true;
    }
}
```

#### **Cache Local**
```javascript
// ✅ Correto - Usar cache para dados estáticos
const presenceCache = new Map();

function getCachedPresence(userId) {
    if (presenceCache.has(userId)) {
        const cached = presenceCache.get(userId);
        if (isValid(cached)) {
            return cached;
        }
    }
    return null;
}
```

### **Monitoramento**

#### **Métricas de Performance**
```javascript
// ✅ Correto - Monitorar performance
const metrics = {
    loadTime: performance.now(),
    presenceUpdates: 0,
    errors: 0,
    fallbackUsage: 0
};

function trackMetric(name, value) {
    metrics[name] = value;
    if (metrics[name] > threshold) {
        console.warn(`[Performance] ⚠️ ${name} acima do limite: ${value}`);
    }
}
```

## 🔒 Segurança

### **Validação de Dados**

#### **Input Validation**
```javascript
// ✅ Correto - Validar entradas
function validateUserId(userId) {
    if (!userId || typeof userId !== 'string') {
        throw new Error('ID de usuário inválido');
    }
    if (!/^[a-zA-Z0-9]{28}$/.test(userId)) {
        throw new Error('Formato de ID inválido');
    }
    return userId;
}
```

#### **Sanitização**
```javascript
// ✅ Correto - Sanitizar dados
function sanitizeUserData(data) {
    return {
        displayName: escapeHtml(data.displayName),
        email: validateEmail(data.email),
        uid: validateUserId(data.uid)
    };
}
```

### **Autenticação**

#### **Verificação de Sessão**
```javascript
// ✅ Correto - Verificar autenticação
async function requireAuth() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Usuário não autenticado');
    }
    return user;
}
```

## 📚 Documentação

### **Comentários de Código**

#### **JSDoc**
```javascript
// ✅ Correto - Documentar funções importantes
/**
 * Atualiza a presença de um usuário no sistema
 * @param {string} userId - ID do usuário
 * @param {Object} presence - Dados de presença
 * @param {boolean} presence.online - Status online/offline
 * @param {Date} presence.lastSeen - Último acesso
 * @returns {Promise<void>}
 */
async function updateUserPresence(userId, presence) {
    // Implementação
}
```

#### **Comentários Inline**
```javascript
// ✅ Correto - Comentários úteis e concisos
// Heartbeat a cada 30 segundos para manter presença ativa
const HEARTBEAT_INTERVAL = 30000;

// Fallback para quando Firebase não está disponível
if (error.code === 'permission-denied') {
    useLocalPresenceFallback();
}
```

### **README e Documentação**

#### **Estrutura de Documentação**
```markdown
# ✅ Correto - Documentação clara e organizada

## Funcionalidade
Descrição clara da funcionalidade

## Como Usar
Exemplos práticos de uso

## Configuração
Instruções de configuração

## Troubleshooting
Problemas comuns e soluções
```

## 🐛 Debugging

### **Logs Estruturados**

#### **Níveis de Log**
```javascript
// ✅ Correto - Usar níveis apropriados
const DEBUG = localStorage.getItem('debugPresence') === 'true';

function log(level, message, data = null) {
    if (level === 'debug' && !DEBUG) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
        case 'debug':
            console.log(logMessage, data);
            break;
        case 'warn':
            console.warn(logMessage, data);
            break;
        case 'error':
            console.error(logMessage, data);
            break;
    }
}
```

#### **Contexto nos Logs**
```javascript
// ✅ Correto - Incluir contexto relevante
console.log('[Presence] 🔄 Iniciando tracking para', userIds.length, 'usuários');
console.log('[Presence] 📡 Evento recebido:', { uid, status: presence.online });
console.error('[Presence] ❌ Erro no Firebase:', { error: error.message, code: error.code });
```

### **Ferramentas de Debug**

#### **Teste de Diagnóstico**
```javascript
// ✅ Correto - Funções de debug dedicadas
function debugPresenceSystem() {
    console.group('🔍 Debug do Sistema de Presença');
    console.log('Usuário atual:', auth.currentUser);
    console.log('Dados de presença:', usersPresence);
    console.log('Intervalo ativo:', presenceInterval);
    console.log('Fallback ativo:', isUsingFallback);
    console.groupEnd();
}
```

## 📋 Checklist de Qualidade

### **Antes do Commit**
- [ ] Código segue padrões estabelecidos
- [ ] Testes passando
- [ ] Logs estruturados
- [ ] Tratamento de erros implementado
- [ ] Documentação atualizada
- [ ] Performance verificada
- [ ] Segurança validada

### **Antes do Deploy**
- [ ] Testes de integração passando
- [ ] Sistema de fallback funcionando
- [ ] Logs de produção configurados
- [ ] Monitoramento ativo
- [ ] Backup configurado
- [ ] Rollback planejado

---

## 📞 Recursos Adicionais

### **Documentação Relacionada**
- [📖 README.md](../README.md) - Documentação principal
- [👨‍💻 DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Guia do desenvolvedor
- [👥 PRESENCE_SYSTEM.md](PRESENCE_SYSTEM.md) - Sistema de presença
- [🔧 FIREBASE_PERMISSION_FIX.md](FIREBASE_PERMISSION_FIX.md) - Correção de permissões

### **Ferramentas Recomendadas**
- **ESLint**: Para linting de código
- **Prettier**: Para formatação
- **Chrome DevTools**: Para debugging
- **Firebase Console**: Para monitoramento

**🎯 Seguir estas práticas garante código de qualidade e manutenibilidade!** 