# 📋 Análise da Lógica de Injeção de Histórico Flowise

## 🎯 **ARQUIVO QUE FUNCIONA: `instance/voetur/templates/chat.html`**

### **📍 LOCALIZAÇÃO DO CÓDIGO (Linhas 874-967)**

---

## **🔍 LÓGICA DETALHADA DE INJEÇÃO**

### **1. 🔑 CHAVES DE LOCALSTORAGE**

```javascript
// Session-specific storage keys
const sessionExtKey = `${proxyFlowId}__${sessionId}_EXTERNAL`;
const sessionFlagKey = `${proxyFlowId}__${sessionId}_historyInjected`;
```

**Exemplo:**
- `sessionExtKey`: `efe59701-afe2-4f4c-8448-bb8e3a32161a__ed57ea27-0c16-4562-a482-54f494ef598e_EXTERNAL`
- `sessionFlagKey`: `efe59701-afe2-4f4c-8448-bb8e3a32161a__ed57ea27-0c16-4562-a482-54f494ef598e_historyInjected`

---

### **2. ✅ VERIFICAÇÃO DE CACHE (Linhas 875-876)**

```javascript
// Inject session history only if not already stored
if (!localStorage.getItem(sessionFlagKey)) {
```

**Lógica:** Só busca da API se não existe flag de que já foi injetado.

---

### **3. 📡 BUSCA DA API FLOWISE (Linhas 877-885)**

```javascript
// Fetch history directly from Flowise API
const response = await fetch(
  `${apiHost}/api/v1/chatmessage/${realFlowId}?sessionId=${sessionId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gpt.flowiseConfig.flowise.token}`
    }
  }
);
if (!response.ok) throw new Error(`Status ${response.status}`);
const apiHistory = await response.json();
```

**URL Exemplo:** `https://flowise.power.tec.br/api/v1/chatmessage/efe59701-afe2-4f4c-8448-bb8e3a32161a?sessionId=ed57ea27-0c16-4562-a482-54f494ef598e`

---

### **4. 🔄 FORMATAÇÃO DOS DADOS (Linhas 887-893)**

```javascript
const formattedHistory = apiHistory.map(msg => ({
  message: msg.content,
  type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
  dateTime: msg.createdDate || new Date().toISOString(),
  messageId: msg.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9)),
  fileUploads: msg.fileUploads || []
}));
```

**Transformação:**
- `msg.content` → `message`
- `msg.role` → `type` (com conversão)
- `msg.createdDate` → `dateTime`
- `msg.id` → `messageId`
- `msg.fileUploads` → `fileUploads`

---

### **5. 💾 ARMAZENAMENTO EM CHAVE ESPECÍFICA DA SESSÃO (Linhas 894-896)**

```javascript
// Store under session-specific keys
localStorage.setItem(sessionExtKey, JSON.stringify({ 
  chatHistory: formattedHistory, 
  chatId: sessionId 
}));
localStorage.setItem(sessionFlagKey, 'true');
```

**Estrutura salva:**
```json
{
  "chatHistory": [
    {
      "message": "analise o seguinte caso...",
      "type": "userMessage",
      "dateTime": "2025-08-15T14:36:02.514Z",
      "messageId": "ed10a030-5d1b-45f8-b161-546ae689d14d",
      "fileUploads": []
    },
    {
      "message": "Claro, estou aqui para ajudar...",
      "type": "apiMessage", 
      "dateTime": "2025-08-15T14:36:06.286Z",
      "messageId": "d9ab88fd-4106-446c-935e-2e1367b2bcfb",
      "fileUploads": []
    }
  ],
  "chatId": "ed57ea27-0c16-4562-a482-54f494ef598e"
}
```

---

### **6. 🔄 CÓPIA PARA CHAVE BASE (Linhas 899-906)**

```javascript
// Copy session history into the base key so web.js picks it up
const baseExtKey = `${proxyFlowId}_EXTERNAL`;
const baseFlagKey = `${proxyFlowId}_historyInjected`;
const sessionData = localStorage.getItem(sessionExtKey);
if (sessionData) {
  localStorage.setItem(baseExtKey, sessionData);
  localStorage.setItem(baseFlagKey, 'true');
}
```

**CRUCIAL:** Esta é a **CHAVE** que o Flowise lê:
- `baseExtKey`: `efe59701-afe2-4f4c-8448-bb8e3a32161a_EXTERNAL`
- `baseFlagKey`: `efe59701-afe2-4f4c-8448-bb8e3a32161a_historyInjected`

---

### **7. 🚀 INICIALIZAÇÃO DO CHATBOT (Linhas 957-967)**

```javascript
const chatArea = document.getElementById('chat-area');
chatArea.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';

// If no previous history exists, start chat without streaming
const extKey = `${cfg.chatflowid}_EXTERNAL`;
if (!localStorage.getItem(extKey)) {
  await import('../assets/js/web.js').then(mod => mod.default.initFull(cfg));
  spinner.remove();
  return;
}

// Import Flowise web component from local assets
await import('../assets/js/web.js').then(mod => mod.default.initFull(cfg));
```

**Sequência:**
1. **Limpa** container do chatbot
2. **Cria** novo elemento `<flowise-fullchatbot>`
3. **Verifica** se existe histórico na chave base
4. **Inicializa** chatbot (que agora "vê" o histórico)

---

## **🎯 ESTRATÉGIA COMPLETA**

### **📋 RESUMO DA SEQUÊNCIA:**

1. **Verificar cache** → Se já injetado, pula
2. **Buscar da API** → `GET /api/v1/chatmessage/{flowId}?sessionId={sessionId}`
3. **Formatar dados** → Converter estrutura da API para formato Flowise
4. **Salvar sessão** → `${flowId}__${sessionId}_EXTERNAL`
5. **Copiar para base** → `${flowId}_EXTERNAL` ← **ESTA É A CHAVE!**
6. **Recriar elemento** → `chatArea.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>'`
7. **Inicializar** → `mod.default.initFull(cfg)`

---

## **❌ DIFERENÇAS NO SISTEMA ATUAL**

### **1. Estrutura de dados incorreta:**
- ❌ **Atual**: `{ chatHistory: [...], chatId: "...", chatflowId: "...", chatType: "EXTERNAL" }`
- ✅ **Correto**: `{ chatHistory: [...], chatId: "..." }`

### **2. Timing de inicialização:**
- ❌ **Atual**: Inicializa → Busca → Salva → Tenta reinicializar
- ✅ **Correto**: Busca → Salva → Copia → Recria elemento → Inicializa

### **3. Estratégia de chaves:**
- ❌ **Atual**: Salva diretamente na chave base
- ✅ **Correto**: Salva na chave de sessão → Copia para chave base

---

## **🔧 IMPLEMENTAÇÃO CORRETA**

### **Código que deveria ser usado:**

```javascript
// 1. Verificar cache
const sessionExtKey = `${chatflowId}__${sessionId}_EXTERNAL`;
const sessionFlagKey = `${chatflowId}__${sessionId}_historyInjected`;

if (!localStorage.getItem(sessionFlagKey)) {
  // 2. Buscar da API
  const response = await fetch(`${apiHost}/api/v1/chatmessage/${chatflowId}?sessionId=${sessionId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  const apiHistory = await response.json();
  
  // 3. Formatar dados
  const formattedHistory = apiHistory.map(msg => ({
    message: msg.content,
    type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
    dateTime: msg.createdDate || new Date().toISOString(),
    messageId: msg.id || crypto.randomUUID(),
    fileUploads: msg.fileUploads || []
  }));
  
  // 4. Salvar na chave de sessão
  localStorage.setItem(sessionExtKey, JSON.stringify({ 
    chatHistory: formattedHistory, 
    chatId: sessionId 
  }));
  localStorage.setItem(sessionFlagKey, 'true');
}

// 5. Copiar para chave base
const baseExtKey = `${chatflowId}_EXTERNAL`;
const baseFlagKey = `${chatflowId}_historyInjected`;
const sessionData = localStorage.getItem(sessionExtKey);
if (sessionData) {
  localStorage.setItem(baseExtKey, sessionData);
  localStorage.setItem(baseFlagKey, 'true');
}

// 6. Recriar elemento e inicializar
const chatArea = document.getElementById('chat-area');
chatArea.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';
await webModule.default.initFull(cfg);
```

---

## **🎯 CONCLUSÃO**

A lógica que funciona tem **3 pontos críticos**:

1. **📦 Estrutura limpa**: Apenas `{ chatHistory: [...], chatId: "..." }`
2. **🔄 Estratégia dupla**: Sessão → Base (cópia)
3. **⏱️ Timing correto**: Histórico primeiro, depois inicialização

O sistema atual falha porque não replica exatamente essa estratégia!

---

## **🧪 ARQUIVO DE TESTE: `test-flowise-history.html`**

### **📍 PROPÓSITO**
Página isolada para testar a lógica de injeção de histórico Flowise sem interferências do sistema principal.

### **🎯 FUNCIONALIDADES**

#### **1. 🔧 Controles de Teste**
- **Configurações**: `chatflowId`, `sessionId`, `apiHost`, `token`
- **Buscar Histórico**: Fetch direto da API Flowise
- **Injetar**: Salva no localStorage com estratégia dupla
- **Verificar**: Mostra conteúdo do localStorage
- **Limpar**: Remove todas as chaves
- **Inicializar**: Cria chatbot e testa carregamento

#### **2. 📡 BUSCA DA API (Função `fetchHistory`)**
```javascript
const response = await fetch(`${apiHost}/api/v1/chatmessage/${chatflowId}?sessionId=${sessionId}`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

#### **3. 🔄 FORMATAÇÃO EXATA (Como Voetur)**
```javascript
chatHistory = apiData.map(msg => ({
    message: msg.content,
    type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
    dateTime: msg.createdDate || new Date().toISOString(),
    messageId: msg.id || Math.random().toString(36).substr(2, 9),
    fileUploads: msg.fileUploads || []
}));
```

#### **4. 💾 INJEÇÃO COM ESTRATÉGIA DUPLA**
```javascript
// Chaves como o arquivo que funciona
const sessionExtKey = `${chatflowId}__${sessionId}_EXTERNAL`;
const baseExtKey = `${chatflowId}_EXTERNAL`;

const historyData = {
    chatHistory: chatHistory,
    chatId: sessionId,
    chatflowId: chatflowId,
    chatType: 'EXTERNAL'  // ⚠️ NOTA: Ainda tem campos extras
};

// 1. Salvar na chave específica da sessão
localStorage.setItem(sessionExtKey, JSON.stringify(historyData));

// 2. COPIAR para a chave base (CRUCIAL!)
localStorage.setItem(baseExtKey, JSON.stringify(historyData));
```

#### **5. 🚀 INICIALIZAÇÃO SIMPLES**
```javascript
const container = document.getElementById('chatbot-container');
container.innerHTML = '<flowise-fullchatbot></flowise-fullchatbot>';

// Verificar histórico antes de inicializar
const baseExtKey = `${chatflowId}_EXTERNAL`;
const existingHistory = localStorage.getItem(baseExtKey);

// Importar e inicializar
const webModule = await import('./services/web.js');
await webModule.default.initFull(config);
```

### **✅ RESULTADO: FUNCIONA!**

**Por que funciona:**
1. **Sequência correta**: Busca → Formata → Salva → Inicializa
2. **Elemento simples**: `<flowise-fullchatbot></flowise-fullchatbot>`
3. **Importação direta**: `import('./services/web.js')`
4. **Sem interferências**: Ambiente isolado

### **❌ DIFERENÇA DO SISTEMA PRINCIPAL**

**Sistema Principal (não funciona):**
- ❌ Chatbot não é criado ao clicar
- ❌ Múltiplas camadas de gerenciamento
- ❌ Timing complexo com setTimeout
- ❌ Possível conflito de inicialização

**Teste (funciona):**
- ✅ Controle manual do processo
- ✅ Criação direta do elemento
- ✅ Importação direta do web.js
- ✅ Sem conflitos

---

## **🔧 CORREÇÃO NECESSÁRIA**

O problema não é a lógica de localStorage, mas sim que **o chatbot nem está sendo criado** no sistema principal!
