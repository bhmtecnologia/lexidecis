# 🔧 Guia de Correção - Erro de Permissão do Firebase

## ❌ Problema

```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

Este erro indica que as regras de segurança do Firebase Firestore não estão configuradas corretamente para permitir a leitura da coleção `userSessions`.

## ✅ Solução Passo a Passo

### 1. Acessar o Firebase Console

1. Vá para: https://console.firebase.google.com/
2. Selecione seu projeto: **lexidecis**
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules**

### 2. Configurar as Regras

Substitua o conteúdo atual das regras por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para userSessions
    match /userSessions/{userId} {
      // Usuários podem ler/escrever suas próprias sessões
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Usuários autenticados podem ler todas as sessões (para admin)
      allow read: if request.auth != null;
      
      // Usuários autenticados podem escrever suas próprias sessões
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regras padrão para outras coleções
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Publicar as Regras

1. Clique em **Publish** para salvar as alterações
2. Aguarde alguns minutos para a propagação das regras

### 4. Testar a Configuração

1. Recarregue a página `admin/users.html`
2. Abra o console do navegador (F12)
3. Verifique se o erro de permissão desapareceu
4. Os indicadores de presença devem aparecer corretamente

## 🔄 Sistema de Fallback

Se o erro persistir mesmo após configurar as regras, o sistema automaticamente usa um **fallback local**:

- Dados de presença são salvos no `localStorage`
- Indicadores de status funcionam com dados locais
- Sistema continua funcionando mesmo sem Firebase

### Testar o Fallback

Use o arquivo de teste: `tests/presence-fallback-test.html`

1. Abra o arquivo no navegador
2. Clique em "Testar Conexão Firestore"
3. Se falhar, clique em "Simular Dados de Presença"
4. Verifique se os indicadores aparecem

## 🐛 Debugging Avançado

### Verificar Status do Firebase

```javascript
// No console do navegador
import { db } from "./admin/assets/js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Testar leitura
const testDoc = doc(db, "userSessions", "test");
getDoc(testDoc).then(doc => {
  console.log("✅ Firebase funcionando");
}).catch(error => {
  console.error("❌ Erro Firebase:", error);
});
```

### Verificar Autenticação

```javascript
// Verificar se o usuário está autenticado
import { auth } from "./admin/assets/js/firebase.js";
console.log("Usuário atual:", auth.currentUser);
```

### Verificar Regras Ativas

1. No Firebase Console, vá para **Firestore Database** → **Rules**
2. Verifique se as regras foram publicadas corretamente
3. Use o **Rules Playground** para testar as regras

## 📋 Checklist de Verificação

- [ ] Acessei o Firebase Console
- [ ] Naveguei para Firestore Database → Rules
- [ ] Substituí as regras pelo código fornecido
- [ ] Publiquei as alterações
- [ ] Aguardei alguns minutos
- [ ] Recarreguei a página admin/users.html
- [ ] Verifiquei o console para erros
- [ ] Testei o sistema de fallback se necessário

## 🆘 Se o Problema Persistir

1. **Verificar Configuração do Firebase**
   - Confirme que o arquivo `admin/assets/js/firebase.js` está correto
   - Verifique se o `projectId` é "lexidecis"

2. **Verificar Autenticação**
   - Certifique-se de que está logado como admin
   - Verifique se o token de autenticação é válido

3. **Usar Sistema de Fallback**
   - O sistema funciona mesmo sem Firebase
   - Dados são salvos localmente
   - Indicadores de presença aparecem normalmente

4. **Contatar Suporte**
   - Forneça logs do console
   - Inclua screenshots do Firebase Console
   - Mencione se o fallback está funcionando

## 📞 Suporte

Se precisar de ajuda adicional:

1. Verifique os logs no console do navegador
2. Teste o sistema de fallback
3. Documente os passos que seguiu
4. Forneça informações sobre seu ambiente (navegador, sistema operacional)

---

**Nota**: O sistema de presença foi projetado para funcionar mesmo quando o Firebase não está disponível, garantindo que a funcionalidade principal continue operacional. 