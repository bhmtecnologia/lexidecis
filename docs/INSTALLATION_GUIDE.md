# 📦 Guia de Instalação - LexiDecis

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação](#instalação)
3. [Configuração do Firebase](#configuração-do-firebase)
4. [Configuração do Sistema](#configuração-do-sistema)
5. [Testes](#testes)
6. [Deploy](#deploy)
7. [Troubleshooting](#troubleshooting)

## 🔧 Pré-requisitos

### **Software Necessário**

```bash
# Node.js (versão 14 ou superior)
node --version
# Deve retornar: v14.x.x ou superior

# Python 3 (para servidor local)
python3 --version
# Deve retornar: Python 3.x.x

# Git
git --version
# Deve retornar: git version 2.x.x

# Navegador moderno
# Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
```

### **Conta Firebase**

- Conta Google ativa
- Projeto Firebase criado
- Acesso ao Firebase Console

## 🚀 Instalação

### **1. Clone do Repositório**

```bash
# Clone o repositório
git clone [url-do-repositorio]
cd lexidecis

# Verifique a estrutura
ls -la
```

### **2. Estrutura de Arquivos**

Após o clone, você deve ter:

```
lexidecis/
├── 📁 admin/           # Painel administrativo
├── 📁 pages/           # Aplicação principal
├── 📁 services/        # Serviços core
├── 📁 tests/           # Sistema de testes
├── 📁 docs/            # Documentação
├── 📁 instance/        # Instâncias específicas
├── README.md           # Documentação principal
└── index.html          # Página inicial
```

### **3. Servidor Local**

```bash
# Inicie o servidor local
python3 -m http.server 8000

# Ou usando Node.js (se disponível)
npx http-server -p 8000

# Verifique se está funcionando
curl http://localhost:8000
# Deve retornar o conteúdo do index.html
```

## 🔥 Configuração do Firebase

### **1. Acessar Firebase Console**

1. Vá para: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione seu projeto ou crie um novo

### **2. Configurar Authentication**

```bash
# No Firebase Console:
# 1. Authentication → Sign-in method
# 2. Habilitar Email/Password
# 3. Configurar domínios autorizados
```

### **3. Configurar Firestore Database**

```bash
# No Firebase Console:
# 1. Firestore Database → Create database
# 2. Escolher modo de produção ou teste
# 3. Selecionar localização (recomendado: us-central1)
```

### **4. Configurar Regras de Segurança**

```javascript
// No Firebase Console → Firestore Database → Rules
// Substitua as regras atuais por:

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

### **5. Obter Configurações**

```bash
# No Firebase Console:
# 1. Project Settings (ícone de engrenagem)
# 2. General → Your apps
# 3. Add app → Web app
# 4. Copiar as configurações
```

### **6. Atualizar Configuração Local**

```javascript
// Arquivo: admin/assets/js/firebase.js
// Substitua as configurações pelas suas:

const firebaseConfig = {
  apiKey: "sua-api-key-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## ⚙️ Configuração do Sistema

### **1. Configurações de API**

```javascript
// Arquivo: config/app.config.js
// Configure as APIs de IA:

const API_CONFIG = {
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sua-openai-api-key'
    },
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: 'sua-gemini-api-key'
    },
    anthropic: {
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sua-anthropic-api-key'
    }
};
```

### **2. Configurações de Ambiente**

```bash
# Crie um arquivo .env (opcional)
touch .env

# Adicione suas variáveis de ambiente
echo "FIREBASE_API_KEY=sua-api-key" >> .env
echo "OPENAI_API_KEY=sua-openai-key" >> .env
echo "GEMINI_API_KEY=sua-gemini-key" >> .env
```

### **3. Configurações de Desenvolvimento**

```javascript
// Arquivo: config/environment.example.js
// Copie para environment.js e configure:

const ENV_CONFIG = {
    development: {
        debug: true,
        logLevel: 'debug',
        apiTimeout: 30000
    },
    production: {
        debug: false,
        logLevel: 'error',
        apiTimeout: 60000
    }
};
```

## 🧪 Testes

### **1. Testes Básicos**

```bash
# Inicie o servidor
python3 -m http.server 8000

# Teste a aplicação principal
open http://localhost:8000/pages/chat.html

# Teste o painel admin
open http://localhost:8000/admin/users.html

# Teste o sistema de presença
open http://localhost:8000/tests/presence-fallback-test.html
```

### **2. Testes de Firebase**

```bash
# No console do navegador (F12):
# Teste de conexão Firebase

import { db } from "./admin/assets/js/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const testDoc = doc(db, "test", "connection");
getDoc(testDoc).then(doc => {
    console.log("✅ Firebase funcionando");
}).catch(error => {
    console.error("❌ Erro Firebase:", error);
});
```

### **3. Testes de Autenticação**

```bash
# No console do navegador:
import { auth } from "./admin/assets/js/firebase.js";
console.log("Usuário atual:", auth.currentUser);

# Deve retornar null se não estiver logado
# Ou um objeto com dados do usuário se logado
```

### **4. Testes de Presença**

```bash
# Acesse o teste de presença
open http://localhost:8000/tests/presence-fallback-test.html

# Clique em "Testar Conexão Firestore"
# Clique em "Testar localStorage"
# Clique em "Simular Dados de Presença"
```

## 🚀 Deploy

### **1. Preparação para Produção**

```bash
# Verifique se tudo está funcionando
python3 -m http.server 8000

# Teste todas as funcionalidades
open http://localhost:8000/tests/index.html

# Verifique logs do console
# Não deve haver erros críticos
```

### **2. Configurações de Produção**

```javascript
// Atualize as configurações para produção
const PROD_CONFIG = {
    firebase: {
        // Use as configurações do seu projeto
    },
    api: {
        // Use URLs de produção
        baseUrl: 'https://sua-api.com',
        timeout: 60000
    },
    debug: false,
    logLevel: 'error'
};
```

### **3. Deploy Firebase**

```bash
# Instale Firebase CLI (se necessário)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicialize o projeto
firebase init

# Deploy das regras
firebase deploy --only firestore:rules

# Deploy do hosting (se necessário)
firebase deploy --only hosting
```

### **4. Deploy em Servidor Web**

```bash
# Copie os arquivos para o servidor
scp -r lexidecis/ user@server:/var/www/html/

# Configure o servidor web (Apache/Nginx)
# Exemplo Apache:
<VirtualHost *:80>
    ServerName lexidecis.com
    DocumentRoot /var/www/html/lexidecis
    
    <Directory /var/www/html/lexidecis>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## 🔧 Troubleshooting

### **Problemas Comuns**

#### **1. Erro de CORS**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solução:**
```bash
# Configure CORS no servidor
# Ou use extensão do navegador para desenvolvimento
```

#### **2. Erro de Permissão Firebase**
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

**Solução:**
1. Verifique as regras do Firestore
2. Aplique as regras corretas
3. Aguarde propagação
4. Use o sistema de fallback

#### **3. Servidor não inicia**
```
Address already in use
```

**Solução:**
```bash
# Use porta diferente
python3 -m http.server 8001

# Ou mate o processo
lsof -ti:8000 | xargs kill -9
```

#### **4. CSS não carrega**
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
```

**Solução:**
```bash
# Verifique se o servidor está rodando
# Verifique os caminhos dos arquivos
# Use servidor HTTP (não file://)
```

### **Checklist de Verificação**

- [ ] Servidor local funcionando
- [ ] Firebase configurado
- [ ] Regras do Firestore aplicadas
- [ ] APIs configuradas
- [ ] Testes passando
- [ ] Console sem erros
- [ ] Sistema de presença funcionando

### **Logs Importantes**

```bash
# Logs do servidor
python3 -m http.server 8000 2>&1 | tee server.log

# Logs do navegador
# F12 → Console → Copiar logs

# Logs do Firebase
# Firebase Console → Functions → Logs
```

## 📞 Suporte

### **Recursos de Ajuda**

- [📖 README.md](../README.md) - Documentação principal
- [👨‍💻 DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) - Guia do desenvolvedor
- [👥 PRESENCE_SYSTEM.md](PRESENCE_SYSTEM.md) - Sistema de presença
- [🔧 FIREBASE_PERMISSION_FIX.md](FIREBASE_PERMISSION_FIX.md) - Correção de permissões

### **Canais de Suporte**

1. **Documentação**: Consulte os guias técnicos
2. **Testes**: Use o sistema de testes para diagnóstico
3. **Console**: Verifique logs do navegador
4. **Issues**: Abra uma issue no repositório

### **Informações Úteis**

```bash
# Versões do sistema
node --version
python3 --version
git --version

# Status do Firebase
# Firebase Console → Project Settings → General

# Status das APIs
# Teste individual de cada API no console
```

---

## ✅ Conclusão

Após seguir este guia, você deve ter:

- ✅ Sistema funcionando localmente
- ✅ Firebase configurado
- ✅ Sistema de presença ativo
- ✅ Testes passando
- ✅ Pronto para desenvolvimento

**Boa sorte com o projeto! 🚀** 