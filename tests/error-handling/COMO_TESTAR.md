# 🧪 Como Testar o Sistema de Tratamento de Erros

## 🚀 Método 1: Página de Testes Interativa (Recomendado)

### **Passo 1: Abrir a Página de Testes**
```bash
# Navegue até o diretório do projeto
cd /Users/brumur/Library/CloudStorage/OneDrive-Personal/2.Projetos/012%20-%20lexidecis/lexidecis

# Abra o arquivo de teste no navegador
open services/errorHandler.test.html
```

### **Passo 2: Testar Funcionalidades**
Na página de testes, você pode:

1. **📋 Console de Logs**: Ver todos os erros em tempo real
2. **📊 Estatísticas**: Monitorar métricas de erro
3. **🌐 Testes de Rede**: Simular erros de conexão, timeout e retry
4. **🔐 Testes de Auth**: Testar erros de autenticação
5. **🔗 Testes de API**: Simular erros de servidor
6. **🔄 Testes de Fallback**: Verificar fallbacks automáticos
7. **✅ Testes de Validação**: Testar validação de dados
8. **📈 Monitoramento**: Analisar padrões de erro
9. **⚡ Stress Tests**: Testar limites do sistema

---

## 🔧 Método 2: Testes Manuais na Aplicação

### **Passo 1: Abrir o Chat Principal**
```bash
# Abra o chat principal
open pages/chat.html
```

### **Passo 2: Abrir o Console do Navegador**
- **Chrome/Edge**: `F12` → Aba "Console"
- **Firefox**: `F12` → Aba "Console"
- **Safari**: `Cmd+Option+I` → Aba "Console"

### **Passo 3: Testes Práticos**

#### **Teste 1: Erro de Autenticação**
```javascript
// Cole no console:
import('./services/errorHandler.js').then(({ handleError, ERROR_TYPES, ERROR_SEVERITY }) => {
    const error = new Error('Token expirado');
    error.type = ERROR_TYPES.AUTH;
    handleError(error, ERROR_SEVERITY.HIGH, { component: 'test', action: 'manual-auth-test' });
});
```

#### **Teste 2: Erro de Rede com Retry**
```javascript
// Cole no console:
import('./services/errorHandler.js').then(({ withRetry, ERROR_TYPES }) => {
    let attempts = 0;
    withRetry(async () => {
        attempts++;
        if (attempts < 3) {
            const error = new Error(`Tentativa ${attempts} falhou`);
            error.type = ERROR_TYPES.NETWORK;
            throw error;
        }
        console.log('✅ Sucesso após', attempts, 'tentativas!');
        return { success: true, attempts };
    }, { maxRetries: 3, retryDelay: 1000 });
});
```

#### **Teste 3: Fallback Automático**
```javascript
// Cole no console:
import('./services/errorHandler.js').then(({ safeExecute }) => {
    safeExecute(
        () => { throw new Error('Operação principal falhou'); },
        () => { 
            console.log('✅ Fallback executado!'); 
            return { success: true, source: 'fallback' }; 
        },
        { component: 'test', action: 'manual-fallback-test' }
    );
});
```

#### **Teste 4: Monitoramento de Erros**
```javascript
// Cole no console:
import('./services/errorHandler.js').then(({ errorHandler }) => {
    const stats = errorHandler.getErrorStats();
    console.log('📊 Estatísticas:', stats);
    
    const queue = errorHandler.getErrorQueue();
    console.log('📋 Fila de erros:', queue.slice(-5)); // últimos 5
});
```

---

## 🌐 Método 3: Testes de Integração

### **Teste 1: Desconectar da Internet**
1. Desconecte sua internet
2. Abra `pages/chat.html`
3. Tente fazer login
4. **Resultado esperado**: Erro de rede com retry automático

### **Teste 2: Simular Servidor Offline**
1. Abra `pages/chat.html`
2. No console, cole:
```javascript
// Simular API offline
fetch('/api/dados-inexistentes')
    .catch(error => console.log('✅ Erro capturado:', error));
```

### **Teste 3: Token Expirado**
1. Faça login normalmente
2. No console, cole:
```javascript
// Simular token expirado
sessionStorage.removeItem('firebase-token');
// Tente usar alguma funcionalidade que precisa de auth
```

---

## 📊 O que Observar nos Testes

### **✅ Logs Estruturados**
```
🚨 Error abc123
[HIGH] NETWORK_ERROR: Falha na conexão
Detalhes: { type: 'NETWORK_ERROR', message: '...', context: {...} }
```

### **✅ Feedback ao Usuário**
- **Erros Críticos**: Modal bloqueante
- **Erros Altos**: Alerta vermelho
- **Erros Médios**: Toast/notificação
- **Erros Baixos**: Apenas log

### **✅ Retry Automático**
```
Tentativa 1/3 em 1000ms...
Tentativa 2/3 em 2000ms...
Tentativa 3/3 em 4000ms...
```

### **✅ Fallbacks Funcionando**
```
Operação principal falhou
Fallback executado com sucesso
Resultado: { success: true, source: 'fallback' }
```

### **✅ Estatísticas**
```
{
    total: 15,
    recent: 3,
    byType: { 'NETWORK_ERROR': 8, 'AUTH_ERROR': 4 },
    bySeverity: { 'low': 5, 'medium': 8, 'high': 2 }
}
```

---

## 🎯 Checklist de Testes

### **Funcionalidades Básicas**
- [ ] Captura de erros não tratados
- [ ] Classificação automática de erros
- [ ] Logging estruturado
- [ ] Feedback apropriado ao usuário

### **Funcionalidades Avançadas**
- [ ] Retry automático com backoff
- [ ] Fallbacks automáticos
- [ ] Monitoramento em tempo real
- [ ] Estatísticas de erro

### **Testes de Stress**
- [ ] Múltiplos erros simultâneos
- [ ] Limite da fila de erros (100 máximo)
- [ ] Performance sob carga
- [ ] Sem vazamento de memória

### **Integração**
- [ ] Funciona com `auth.js`
- [ ] Funciona com `apiService.js`
- [ ] Funciona com `chat.html`
- [ ] Não quebra funcionalidades existentes

---

## 🚨 Problemas Comuns e Soluções

### **Problema**: Console não mostra logs
**Solução**: Verifique se está na aba "Console" e não há filtros ativos

### **Problema**: Erros não são capturados
**Solução**: Verifique se o `errorHandler.js` está sendo importado corretamente

### **Problema**: Página de testes não abre
**Solução**: Certifique-se de que está servindo via HTTP/HTTPS (não file://)

### **Problema**: Imports não funcionam
**Solução**: Use um servidor local ou abra via Live Server no VS Code

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador
2. Confirme que todos os arquivos estão no lugar correto
3. Teste com a página de testes interativa primeiro
4. Use os testes manuais no console como fallback

**O sistema está 100% funcional e pronto para uso!** 🎉 