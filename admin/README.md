# Painel Administrativo - LexiDecis

Sistema de administração para plataforma LexiDecis com gerenciamento de usuários, unidades e GPTs.

## Funcionalidades

### Dashboard Principal
- **Visão geral do sistema**: Estatísticas em tempo real
- **Monitoramento de serviços**: Status dos provedores de IA
- **Métricas dinâmicas**: Contadores animados para usuários, unidades e GPTs

### Gerenciamento
- **Usuários**: Criar, editar e remover usuários
- **Unidades**: Administrar unidades do sistema
- **GPTs**: Configurar e gerenciar GPTs disponíveis

### Monitoramento de IA
- **Status em tempo real**: Verificação automática dos serviços
- **Indicadores visuais**: Cores e tooltips informativos
- **Motor de IA (Flowise)**: Monitoramento específico do engine Flowise
- **Motor de Automação (n8n)**: Monitoramento específico do engine n8n

## Motor de IA (Flowise)

### Funcionalidade
O sistema agora monitora o status do Motor de IA através da API do Flowise:

**Endpoint**: `https://flowise.power.tec.br/ping`
- **Método**: GET
- **Resposta esperada**: 200 com "pong" quando funcionando
- **Status**: 500 ou erro quando não está rodando

### Implementação

#### Na API (api.js)
```javascript
import * as API from "./assets/js/api.js";

// Verificar status do Motor de IA
const status = await API.checkFlowiseStatus();
if (status.status === 'ok') {
  console.log('✅ Motor funcionando:', status.message);
} else {
  console.log('❌ Motor com problema:', status.message);
}
```

#### No Dashboard
- **Indicador visual**: Círculo verde (ok) ou vermelho (erro)
- **Tooltip informativo**: Detalhes sobre o status
- **Atualização automática**: Verificação a cada 30 segundos

#### Testes
No console do navegador:
```javascript
// Verificar status manualmente
checkAiEngineStatus();
```

### Estados do Motor
- **🟢 Verde**: Motor funcionando (resposta 200 + "pong")
- **🔴 Vermelho**: Motor com problema (500 ou erro de conexão)

### Configuração
- **Timeout**: 10 segundos para resposta
- **Intervalo**: Verificação a cada 30 segundos
- **Fallback**: Tratamento de erros de CORS/conexão

## Motor de Automação (n8n)

### Funcionalidade
O sistema monitora o status do Motor de Automação com fallback inteligente:

**Método Primário**: `https://webhook.power.tec.br/webhook/status/v2?service=n8n`
- **Tipo**: Proxy para evitar problemas de CORS
- **Fallback**: Se o serviço não estiver registrado no proxy, assume "funcionando mas não monitorado"
- **Indicador**: Verde se monitorado e funcionando, amarelo se não monitorado

### Implementação

#### Na API (api.js)
```javascript
import * as API from "./assets/js/api.js";

// Verificar status do Motor de Automação
const status = await API.checkN8nStatus();
if (status.status === 'ok') {
  console.log('✅ Motor funcionando:', status.message);
} else {
  console.log('❌ Motor com problema:', status.message);
}
```

#### No Dashboard
- **Indicador visual**: Círculo verde (ok) ou vermelho (erro)
- **Tooltip informativo**: Detalhes sobre o status
- **Atualização automática**: Verificação a cada 30 segundos

#### Testes
No console do navegador:
```javascript
// Verificar status do Motor de Automação
checkAutomationEngineStatus();
```

### Estados do Motor
- **🟢 Verde**: Motor funcionando e monitorado (proxy retorna status "none" ou "ok")
- **🟡 Amarelo**: Motor assumido como funcionando mas não monitorado
- **🔴 Vermelho**: Motor com problema (proxy retorna erro ou status crítico)

### Configuração
- **Timeout**: 10 segundos para resposta
- **Intervalo**: Verificação a cada 30 segundos
- **Fallback**: Tratamento de erros de CORS/conexão

## Estrutura de Arquivos

```
admin/
├── assets/
│   ├── css/
│   │   ├── admin.css
│   │   └── admin-layout.css
│   └── js/
│       ├── api.js              # API principal + Motor de IA
│       ├── auth.js             # Autenticação
│       ├── status-indicator.js # Indicadores de status
│       └── ...
├── index.html                  # Dashboard principal
├── users.html                  # Gerenciamento de usuários
├── units.html                  # Gerenciamento de unidades
├── gpts.html                   # Gerenciamento de GPTs
└── README.md                   # Este arquivo
```

## Uso

1. **Acesso**: Faça login no sistema administrativo
2. **Dashboard**: Visualize métricas e status dos serviços
3. **Monitoramento**: Observe o indicador do "Motor de IA"
4. **Troubleshooting**: Use o console para verificar erros

## Desenvolvimento

### Adicionar novos serviços de IA
1. Edite `status-indicator.js`
2. Adicione o serviço na array `services`
3. Crie o card correspondente no HTML

### Personalizar verificações
1. Modifique `checkFlowiseStatus()` em `api.js`
2. Ajuste intervalos em `FlowiseStatusIndicator`
3. Customize tooltips e mensagens

## Suporte

Para problemas com o Motor de IA:
1. Verifique se `https://flowise.power.tec.br/ping` está acessível
2. Consulte o console do navegador para erros
3. Verifique configurações de CORS no servidor Flowise

Para problemas com o Motor de Automação:
1. **Indicador Amarelo**: Normal se o n8n não estiver registrado no proxy de status
2. **Indicador Vermelho**: Verifique se `https://webhook.power.tec.br/webhook/status/v2?service=n8n` está acessível
3. Consulte o console do navegador para erros
4. O sistema tem fallback automático para não causar falsos alarmes

### Funções de Teste
No console do navegador:
```javascript
// Testar todos os motores
checkAiEngineStatus();          // Motor de IA (Flowise)
checkAutomationEngineStatus();  // Motor de Automação (n8n)
``` 