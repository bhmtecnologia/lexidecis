# 🔧 Guia de Troubleshooting - LexiDecis

## 📋 Índice

1. [Problemas de Configuração](#problemas-de-configuração)
2. [Problemas de Importação](#problemas-de-importação)
3. [Problemas de Autenticação](#problemas-de-autenticação)
4. [Problemas de API](#problemas-de-api)
5. [Problemas de Testes](#problemas-de-testes)
6. [Problemas de Performance](#problemas-de-performance)
7. [Problemas de Deploy](#problemas-de-deploy)

---

## ⚙️ Problemas de Configuração

### **❌ Erro: Configurações não encontradas**

**Sintomas:**
```
❌ Erros de configuração: ['FIREBASE_API_KEY não configurada']
```

**Solução:**
```bash
# 1. Copie o arquivo de exemplo
cp config/environment.example.js config/environment.js

# 2. Configure suas chaves
nano config/environment.js

# 3. Valide as configurações
node -e "import('./config/app.config.js').then(m => console.log(m.validateConfig()))"
```

### **❌ Erro: Variáveis de ambiente não carregadas**

**Sintomas:**
```
undefined is not a function
```

**Solução:**
```javascript
// Verifique se o arquivo está sendo importado corretamente
import { ENV_CONFIG } from './config/environment.js';
console.log('Configurações:', ENV_CONFIG);
```

---

## 📦 Problemas de Importação

### **❌ Erro 404 em imports**

**Sintomas:**
```
GET http://localhost:8000/services/stateManager.js net::ERR_ABORTED 404 (Not Found)
```

**Causas:**
- Arquivo não existe
- Caminho incorreto
- Servidor não está rodando

**Soluções:**

#### **1. Verificar se o arquivo existe**
```bash
# Verifique se o arquivo existe
ls -la services/stateManager.js

# Se não existir, crie-o
touch services/stateManager.js
```

#### **2. Verificar caminhos relativos**
```javascript
// ❌ Caminho incorreto
import { StateManager } from '../services/stateManager.js';

// ✅ Caminho correto (dependendo da estrutura)
import { StateManager } from './services/stateManager.js';
import { StateManager } from '../../services/stateManager.js';
```

#### **3. Usar servidor HTTP**
```bash
# ❌ Não funciona com file://
file:///path/to/your/project/pages/chat.html

# ✅ Funciona com servidor HTTP
python3 -m http.server 8000
open http://localhost:8000/pages/chat.html
```

### **❌ Erro: Módulos não suportados**

**Sintomas:**
```
Uncaught SyntaxError: Cannot use import statement outside a module
```

**Solução:**
```html
<!-- Adicione type="module" no script -->
<script type="module">
    import { StateManager } from './services/stateManager.js';
</script>
```

---

## 🔐 Problemas de Autenticação

### **❌ Erro: Firebase não configurado**

**Sintomas:**
```
Firebase: Error (auth/invalid-api-key)
```

**Solução:**
```javascript
// 1. Verifique a configuração Firebase
const firebaseConfig = {
    apiKey: "sua-api-key-real",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    // ... outras configs
};

// 2. Inicialize o Firebase
firebase.initializeApp(firebaseConfig);
```

### **❌ Erro: Usuário não autenticado**

**Sintomas:**
```
Firebase: Error (auth/user-not-found)
```

**Soluções:**

#### **1. Verificar estado de autenticação**
```javascript
// Verifique se o usuário está logado
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('✅ Usuário logado:', user.email);
    } else {
        console.log('❌ Usuário não logado');
    }
});
```

#### **2. Forçar login**
```javascript
// Login com email/senha
firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        console.log('✅ Login realizado');
    })
    .catch((error) => {
        console.error('❌ Erro no login:', error);
    });
```

---

## 🌐 Problemas de API

### **❌ Erro de CORS**

**Sintomas:**
```
Access to fetch at 'https://api.openai.com' from origin 'http://localhost:8000' has been blocked by CORS policy
```

**Soluções:**

#### **1. Usar proxy CORS**
```javascript
const API_PROXY = 'https://cors-anywhere.herokuapp.com/';
const response = await fetch(API_PROXY + 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(data)
});
```

#### **2. Configurar servidor proxy local**
```javascript
// Criar servidor proxy local
const proxyUrl = 'http://localhost:3000/api/proxy';
```

### **❌ Erro: API key inválida**

**Sintomas:**
```
401 Unauthorized
```

**Solução:**
```javascript
// 1. Verifique se a API key está correta
console.log('API Key:', apiKey.substring(0, 10) + '...');

// 2. Teste a API key
const testResponse = await fetch('https://api.openai.com/v1/models', {
    headers: {
        'Authorization': `Bearer ${apiKey}`
    }
});

if (testResponse.ok) {
    console.log('✅ API key válida');
} else {
    console.log('❌ API key inválida');
}
```

### **❌ Erro: Rate limit excedido**

**Sintomas:**
```
429 Too Many Requests
```

**Solução:**
```javascript
// Implementar retry com backoff exponencial
async function apiCallWithRetry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 429 && i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
                console.log(`Rate limit atingido, aguardando ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}
```

---

## 🧪 Problemas de Testes

### **❌ Erro: Testes não executam**

**Sintomas:**
```
Uncaught ReferenceError: runAllTests is not defined
```

**Solução:**
```javascript
// 1. Verifique se o TestManager está importado
import { TestManager } from './utils/testHelpers.js';

// 2. Crie uma instância do TestManager
const testManager = new TestManager('Meus Testes');

// 3. Adicione testes
testManager.addTest('Teste exemplo', () => {
    // seu teste aqui
});

// 4. Execute os testes
testManager.runAllTests();
```

### **❌ Erro: Imports não funcionam nos testes**

**Sintomas:**
```
GET http://localhost:8000/tests/chat-app/unit/utils/testHelpers.js net::ERR_ABORTED 404
```

**Solução:**
```javascript
// Verifique os caminhos relativos
// De: tests/chat-app/unit/services/stateManager.test.html
// Para: tests/chat-app/utils/testHelpers.js

// Caminho correto:
import { TestManager } from '../../utils/testHelpers.js';
```

### **❌ Erro: Mocks não funcionam**

**Sintomas:**
```
TypeError: Cannot read property 'getState' of undefined
```

**Solução:**
```javascript
// 1. Crie um mock adequado
class MockStateManager {
    constructor() {
        this.state = {
            session: {},
            chat: {},
            gpt: {}
        };
    }
    
    getState() {
        return this.state;
    }
    
    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }
}

// 2. Use o mock nos testes
const stateManager = new MockStateManager();
const state = stateManager.getState();
```

---

## ⚡ Problemas de Performance

### **❌ Erro: Aplicação lenta**

**Sintomas:**
- Carregamento demorado
- Interface travada
- Alto uso de memória

**Soluções:**

#### **1. Otimizar carregamento**
```javascript
// Lazy loading de módulos
const loadModule = async (moduleName) => {
    const module = await import(`./modules/${moduleName}.js`);
    return module.default;
};

// Carregar apenas quando necessário
if (userWantsChat) {
    const chatModule = await loadModule('chat');
    chatModule.init();
}
```

#### **2. Debounce em inputs**
```javascript
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedSearch = debounce(searchFunction, 300);
```

#### **3. Limpar listeners**
```javascript
// Remover event listeners quando não necessário
function cleanup() {
    element.removeEventListener('click', handler);
    clearInterval(interval);
    clearTimeout(timeout);
}
```

### **❌ Erro: Memory leak**

**Sintomas:**
- Uso de memória crescente
- Aplicação fica lenta com o tempo

**Solução:**
```javascript
// 1. Limpar arrays grandes
chatHistory.splice(0, chatHistory.length - 100); // Manter apenas 100 mensagens

// 2. Remover event listeners
componentWillUnmount() {
    this.cleanup();
}

// 3. Limpar timeouts/intervals
clearTimeout(this.timeout);
clearInterval(this.interval);
```

---

## 🚀 Problemas de Deploy

### **❌ Erro: Assets não carregam**

**Sintomas:**
```
GET https://lexidecis.com/services/stateManager.js net::ERR_ABORTED 404
```

**Solução:**
```nginx
# Configuração Nginx para SPA
server {
    listen 80;
    server_name lexidecis.com;
    
    location / {
        root /var/www/lexidecis;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Configuração para arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### **❌ Erro: HTTPS não funciona**

**Sintomas:**
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource
```

**Solução:**
```javascript
// 1. Use URLs relativas
const apiUrl = '/api/chat'; // ✅
const apiUrl = 'http://api.lexidecis.com/chat'; // ❌

// 2. Ou use protocolo relativo
const apiUrl = '//api.lexidecis.com/chat'; // ✅
```

### **❌ Erro: Cache não atualiza**

**Sintomas:**
- Usuários veem versão antiga
- Mudanças não aparecem

**Solução:**
```javascript
// 1. Versionar assets
const version = '1.0.0';
const assetUrl = `/assets/app.js?v=${version}`;

// 2. Cache busting
const timestamp = Date.now();
const url = `/api/data?t=${timestamp}`;

// 3. Service Worker para cache
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
```

---

## 🛠️ Ferramentas de Debug

### **Console Logging Avançado**
```javascript
// Log estruturado
console.group('🔧 Debug StateManager');
console.log('Estado atual:', state);
console.log('Ação:', action);
console.log('Timestamp:', new Date().toISOString());
console.groupEnd();

// Performance logging
console.time('Operação lenta');
// ... código aqui
console.timeEnd('Operação lenta');

// Memory usage
console.log('Memory:', performance.memory);
```

### **Network Debug**
```javascript
// Monitorar requisições
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🌐 Fetch:', args[0]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('✅ Response:', response.status);
            return response;
        })
        .catch(error => {
            console.error('❌ Fetch error:', error);
            throw error;
        });
};
```

### **State Debug**
```javascript
// Monitorar mudanças de estado
const originalSetState = this.setState;
this.setState = function(newState) {
    console.log('🔄 State change:', newState);
    return originalSetState.call(this, newState);
};
```

---

## 📞 Suporte

### **Canais de Ajuda**
- **Issues**: Reporte bugs no GitHub
- **Documentação**: Consulte os guias técnicos
- **Logs**: Verifique o console do navegador
- **Testes**: Execute o sistema de testes

### **Informações Úteis**
```javascript
// Informações do sistema
console.log('User Agent:', navigator.userAgent);
console.log('Screen Size:', screen.width + 'x' + screen.height);
console.log('Viewport:', window.innerWidth + 'x' + window.innerHeight);
console.log('URL:', window.location.href);
console.log('Timestamp:', new Date().toISOString());
```

---

**🔧 LexiDecis** - Guia de Troubleshooting | Versão 1.0 | Criado com ❤️ para qualidade 