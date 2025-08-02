# Sistema de Presença - LexiDecis

## Visão Geral

O sistema de presença permite visualizar em tempo real quais usuários estão online ou offline na aplicação LexiDecis. Este sistema foi implementado na página `admin/users.html` e utiliza o Firebase Firestore para tracking de status.

## Funcionalidades

### ✅ Implementado

1. **Indicador de Status Visual**
   - 🟢 **Online**: Usuário ativo com indicador verde pulsante
   - ⚫ **Offline**: Usuário inativo com indicador cinza
   - 🟡 **Desconhecido**: Status não disponível com indicador amarelo

2. **Tracking em Tempo Real**
   - Heartbeat a cada 30 segundos para usuários ativos
   - Detecção automática quando usuário fecha a página
   - Atualização em tempo real via Firebase Firestore

3. **Informações Detalhadas**
   - Tooltip com timestamp do último acesso
   - Nome de exibição do usuário
   - Email do usuário

## Arquitetura

### Componentes Principais

1. **AuthService** (`admin/assets/js/auth.js`)
   - Gerencia tracking de presença do usuário logado
   - Heartbeat automático
   - Marcação de offline ao sair

2. **DOM Module** (`admin/assets/js/dom.js`)
   - Renderiza indicadores de presença na tabela
   - Atualiza status em tempo real
   - Estilos visuais

3. **Main Module** (`admin/assets/js/main.js`)
   - Inicializa tracking de presença para todos os usuários
   - Gerencia listeners de eventos
   - Limpeza de recursos

### Estrutura de Dados

```javascript
// Collection: userSessions
{
  uid: "firebase_user_id",
  email: "user@example.com",
  displayName: "Nome do Usuário",
  lastLogin: Timestamp,
  online: boolean,
  lastSeen: Timestamp
}
```

## Como Funciona

### 1. Login do Usuário
```javascript
// Quando usuário faz login
saveUserSession(user) {
  // Salva sessão com status online
  setDoc(userDoc, {
    online: true,
    lastSeen: serverTimestamp()
  });
}
```

### 2. Heartbeat
```javascript
// A cada 30 segundos
setInterval(async () => {
  await setDoc(userDoc, {
    lastSeen: serverTimestamp(),
    online: true
  });
}, 30000);
```

### 3. Detecção de Offline
```javascript
// Quando página é fechada
window.addEventListener('beforeunload', () => {
  markUserOffline(user.uid);
});
```

### 4. Visualização em Tempo Real
```javascript
// Listener para mudanças no Firestore
onSnapshot(userDoc, (doc) => {
  const data = doc.data();
  updateUserPresence(uid, {
    online: data.online,
    lastSeen: data.lastSeen
  });
});
```

## Configuração

### Firebase Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userSessions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Admins podem ler todas as sessões
    }
  }
}
```

### Sistema de Fallback

O sistema inclui um mecanismo de fallback que funciona mesmo quando o Firebase Firestore não está disponível:

- **localStorage**: Dados de presença são salvos localmente como backup
- **Duração**: Dados locais são válidos por até 5 minutos
- **Transparência**: O sistema automaticamente usa o fallback quando necessário
- **Logs**: Todas as falhas são registradas no console para debugging

### Variáveis de Ambiente

Nenhuma configuração adicional necessária. O sistema utiliza as configurações existentes do Firebase.

## Monitoramento

### Logs Importantes

```javascript
// Início do tracking
console.log('[startPresenceTracking] 🔍 Iniciando tracking de presença para X usuários');

// Mudança de status
console.log('[presenceChanged] 👤 Usuário X mudou status para Y');

// Erros
console.error('[startPresenceTracking] ❌ Erro ao iniciar tracking de presença:', error);
```

### Métricas Disponíveis

- Número de usuários online
- Tempo médio de sessão
- Frequência de reconexões
- Usuários mais ativos

## Troubleshooting

### Problemas Comuns

1. **Erro de Permissão do Firebase**
   ```
   FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
   ```
   **Solução:**
   - Verificar se as regras do Firestore estão configuradas corretamente
   - Acessar Firebase Console → Firestore Database → Rules
   - Aplicar as regras sugeridas acima
   - Aguardar alguns minutos para propagação
   - O sistema automaticamente usa fallback local se o erro persistir

2. **Status não atualiza**
   - Verificar conexão com Firebase
   - Verificar regras do Firestore
   - Verificar console para erros
   - Usar `tests/presence-fallback-test.html` para diagnosticar

3. **Usuário aparece offline quando está online**
   - Verificar se o heartbeat está funcionando
   - Verificar se não há múltiplas abas abertas
   - Verificar se o usuário não foi deslogado

4. **Performance lenta**
   - Reduzir frequência do heartbeat (padrão: 30s)
   - Implementar paginação para muitos usuários
   - Usar cache local para dados estáticos

### Debug

```javascript
// Habilitar logs detalhados
localStorage.setItem('debugPresence', 'true');

// Verificar dados de presença
console.log('usersPresence:', usersPresence);
```

## Próximas Melhorias

### Planejado

1. **Status Avançado**
   - "Ausente" (inativo por X minutos)
   - "Ocupado" (em reunião/atividade)
   - "Não perturbe"

2. **Notificações**
   - Alerta quando usuário específico fica online
   - Notificação de usuários ativos

3. **Analytics**
   - Dashboard de atividade
   - Relatórios de uso
   - Métricas de engajamento

4. **Integração**
   - Status no chat
   - Indicador no sidebar
   - Notificações push

## Contribuição

Para contribuir com melhorias no sistema de presença:

1. Fork o repositório
2. Crie uma branch para sua feature
3. Implemente as mudanças
4. Teste com múltiplos usuários
5. Submeta um pull request

## Licença

Este sistema faz parte do projeto LexiDecis e segue as mesmas diretrizes de licenciamento. 