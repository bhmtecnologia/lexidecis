# Sistema de Presença no Chat - LexiDecis

## 📋 Visão Geral

O sistema de presença no chat permite que os usuários vejam quantos usuários estão ativos no sistema em tempo real. Esta funcionalidade foi implementada para melhorar a experiência do usuário, fornecendo informações sobre a atividade do sistema.

## 🏗️ Arquitetura

### Componentes Principais

1. **`presenceService.js`** - Serviço principal que gerencia a contagem de usuários ativos
2. **`renderer.js`** - Integra o serviço de presença com a interface do usuário
3. **`auth.js`** - Gerencia o status online/offline dos usuários
4. **`pages/chat.html`** - Interface que exibe o contador de usuários ativos

### Fluxo de Dados

```
Firebase Firestore (userSessions)
    ↓
presenceService.js (listener em tempo real)
    ↓
renderer.js (observer pattern)
    ↓
chat.html (user menu)
```

## 🔧 Implementação

### 1. Serviço de Presença (`services/presenceService.js`)

```javascript
class PresenceService {
    constructor() {
        this.activeUsersCount = 0;
        this.presenceUnsubscribe = null;
        this.observers = [];
        this.isInitialized = false;
    }
    
    // Inicializa o serviço
    async init() {
        // Configura listener para mudanças de presença
        this.setupPresenceListener();
        // Conta usuários ativos inicialmente
        await this.updateActiveUsersCount();
    }
    
    // Configura listener em tempo real
    setupPresenceListener() {
        const userSessionsRef = collection(db, "userSessions");
        this.presenceUnsubscribe = onSnapshot(userSessionsRef, (snapshot) => {
            let onlineCount = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data && data.online === true) {
                    onlineCount++;
                }
            });
            this.activeUsersCount = onlineCount;
            this.notifyObservers(onlineCount);
        });
    }
}
```

### 2. Integração no Renderer (`services/renderer.js`)

```javascript
// Importa o serviço de presença
import presenceService from './presenceService.js';

// Inicializa o serviço durante o carregamento da aplicação
await presenceService.init();
setupPresenceUI();

// Configura a UI de presença
function setupPresenceUI() {
    presenceService.onActiveUsersChange((count) => {
        updateActiveUsersCount(count);
    });
}

// Atualiza o contador no user menu
function updateActiveUsersCount(count) {
    const menuItems = document.querySelectorAll('.lexi-user-menu-item');
    menuItems.forEach(item => {
        const text = item.textContent;
        if (text.includes('Usuários Ativos')) {
            const span = item.querySelector('span');
            if (span) {
                span.textContent = `Usuários Ativos: ${count}`;
            }
        }
    });
}
```

### 3. Gerenciamento de Status (`services/auth.js`)

```javascript
// Marca usuário como online ao fazer login
async function saveUserSession(user) {
    const userDoc = doc(db, "userSessions", user.uid);
    await setDoc(userDoc, {
        email: user.email,
        displayName: user.displayName || "Usuário Anônimo",
        lastLogin: serverTimestamp(),
        online: true, // Marca como online
        lastSeen: serverTimestamp()
    }, { merge: true });
}

// Marca usuário como offline ao sair
async function markUserOffline(uid) {
    const userDoc = doc(db, "userSessions", uid);
    await setDoc(userDoc, {
        online: false,
        lastSeen: serverTimestamp()
    }, { merge: true });
}
```

## 🎯 Funcionalidades

### Contagem em Tempo Real
- **Listener Firestore**: Monitora mudanças na coleção `userSessions`
- **Atualização Automática**: Contador é atualizado automaticamente quando usuários entram/saem
- **Observer Pattern**: Notifica a UI quando há mudanças na contagem

### Gerenciamento de Status
- **Login**: Usuário é marcado como `online: true`
- **Logout**: Usuário é marcado como `online: false`
- **Fechamento da Página**: Listener `beforeunload` marca usuário como offline

### Interface do Usuário
- **User Menu**: Exibe contador de usuários ativos no menu do usuário
- **Atualização em Tempo Real**: Contador é atualizado automaticamente
- **Indicador Visual**: Ícone verde indica usuários ativos

## 📊 Estrutura de Dados

### Firestore Collection: `userSessions`

```javascript
{
  uid: "string",           // Firebase UID do usuário
  email: "string",         // Email do usuário
  displayName: "string",   // Nome de exibição
  lastLogin: "timestamp",  // Último login
  lastLogout: "timestamp", // Último logout
  online: "boolean",       // Status online/offline
  lastSeen: "timestamp"    // Última atividade
}
```

## 🧪 Testes

### Arquivo de Teste: `tests/presence-chat-test.html`

O arquivo de teste permite:
- **Testar o Serviço**: Verificar se o serviço de presença está funcionando
- **Simular Status**: Marcar usuário como online/offline manualmente
- **Monitorar Logs**: Acompanhar eventos em tempo real
- **Verificar Contagem**: Confirmar se a contagem está correta

### Como Usar o Teste

1. Acesse `tests/presence-chat-test.html`
2. Faça login no sistema
3. Use os botões para testar diferentes cenários
4. Monitore os logs para verificar o funcionamento

## 🔍 Monitoramento e Debug

### Logs do Sistema

```javascript
// Logs do PresenceService
logService.info('PresenceService', 'Inicializando serviço de presença');
logService.debug('PresenceService', `Usuários ativos atualizados: ${count}`);
logService.warn('PresenceService', 'Erro no listener de presença:', error);

// Logs do Renderer
debugLog("[Renderer] Serviço de presença inicializado");
debugLog("[Renderer] Contador de usuários ativos atualizado:", count);
```

### Console do Navegador

Para debug, verifique:
- **Firebase Console**: Coleção `userSessions` no Firestore
- **Console do Navegador**: Logs do PresenceService e Renderer
- **Network Tab**: Requisições para o Firestore

## 🚀 Configuração

### Pré-requisitos

1. **Firebase Configurado**: Projeto Firebase com Firestore habilitado
2. **Regras do Firestore**: Permissões para ler/escrever `userSessions`
3. **Autenticação**: Sistema de autenticação Firebase funcionando

### Regras do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userSessions/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔧 Manutenção

### Limpeza de Dados

Para manter a performance, considere:
- **Limpeza Periódica**: Remover sessões antigas (mais de 24h)
- **Índices**: Criar índices para consultas por `online` e `lastSeen`
- **Monitoramento**: Acompanhar uso de recursos do Firestore

### Otimizações

1. **Debounce**: Evitar atualizações muito frequentes
2. **Cache Local**: Usar localStorage como fallback
3. **Lazy Loading**: Carregar dados apenas quando necessário

## 📝 Troubleshooting

### Problemas Comuns

1. **Contador Não Atualiza**
   - Verificar conexão com Firebase
   - Confirmar regras do Firestore
   - Verificar logs do console

2. **Usuário Não Aparece Online**
   - Verificar se `saveUserSession` foi chamada
   - Confirmar dados no Firestore
   - Verificar listener `beforeunload`

3. **Erro de Permissão**
   - Verificar regras do Firestore
   - Confirmar autenticação do usuário
   - Verificar UID do usuário

### Soluções

1. **Fallback Local**: Sistema usa localStorage quando Firestore falha
2. **Retry Logic**: Tentativas automáticas de reconexão
3. **Error Handling**: Tratamento robusto de erros

## 🔮 Melhorias Futuras

### Funcionalidades Planejadas

1. **Lista de Usuários Online**: Mostrar quem está online
2. **Status Personalizado**: "Disponível", "Ausente", "Ocupado"
3. **Notificações**: Alertar quando usuários entram/saem
4. **Estatísticas**: Histórico de atividade
5. **Presença por Sala**: Contagem por chat/conversação

### Otimizações Técnicas

1. **WebSockets**: Substituir Firestore por WebSockets para melhor performance
2. **Compressão**: Reduzir tráfego de dados
3. **Cache Inteligente**: Cache mais sofisticado
4. **Métricas**: Dashboard de métricas de presença

---

**Versão**: 1.0  
**Última Atualização**: Dezembro 2024  
**Responsável**: Sistema de Presença - LexiDecis 