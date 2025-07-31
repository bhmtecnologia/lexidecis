# Sistema Unificado de Loading - LexiDecis

## Visão Geral

O **UnifiedLoadingManager** é um sistema centralizado que consolida todos os tipos de loading da aplicação LexiDecis, substituindo os múltiplos sistemas fragmentados por uma solução robusta e consistente.

## Características Principais

- ✅ **Sistema Unificado**: Um único gerenciador para todos os tipos de loading
- ✅ **Contextos Predefinidos**: Diferentes tipos de loading com configurações específicas
- ✅ **Progresso Visual**: Barras de progresso e etapas visuais
- ✅ **Cancelamento**: Possibilidade de cancelar operações longas
- ✅ **Acessibilidade**: Suporte completo para tecnologias assistivas
- ✅ **Responsivo**: Adaptado para dispositivos móveis
- ✅ **Performance**: Otimizado e eficiente
- ✅ **Logging**: Integração com sistema de logs

## Contextos de Loading Disponíveis

| Contexto | Descrição | Tipo | Progresso | Etapas | Cancelável | Timeout |
|----------|-----------|------|-----------|--------|------------|---------|
| `APP_INITIALIZATION` | Inicialização da aplicação | Fullscreen | ✅ | ✅ | ❌ | 60s |
| `CHAT_LOADING` | Carregamento de chat | Overlay | ❌ | ❌ | ✅ | 15s |
| `MESSAGE_SENDING` | Envio de mensagem | Inline | ❌ | ❌ | ❌ | 10s |
| `FILE_PROCESSING` | Processamento de arquivo | Overlay | ✅ | ❌ | ✅ | 30s |
| `API_CALLS` | Chamada de API | Inline | ❌ | ❌ | ❌ | 10s |
| `HISTORY_LOADING` | Carregamento de histórico | Overlay | ✅ | ❌ | ✅ | 20s |

## Uso Básico

### Importação

```javascript
import { getLoadingManager, LoadingUtils } from './unifiedLoadingManager.js';
```

### Exibir Loading

```javascript
// Método simples
const loadingId = LoadingUtils.show('CHAT_LOADING', {
    message: 'Carregando chat...'
});

// Método completo
const loadingManager = getLoadingManager();
const loadingId = loadingManager.showLoading('CHAT_LOADING', {
    message: 'Carregando chat...',
    allowCancel: true,
    timeout: 15000
});
```

### Esconder Loading

```javascript
// Método simples
LoadingUtils.hide(loadingId);

// Método completo
loadingManager.hideLoading(loadingId);
```

### Atualizar Progresso

```javascript
// Atualizar progresso (0-100)
LoadingUtils.progress(loadingId, 50, 'Processando dados...');

// Atualizar etapa
LoadingUtils.step(loadingId, 'Carregar dados', 'completed');
LoadingUtils.step(loadingId, 'Processar arquivos', 'loading');
LoadingUtils.step(loadingId, 'Conectar API', 'error');
```

## Exemplos de Uso

### 1. Loading de Inicialização da Aplicação

```javascript
const loadingId = LoadingUtils.show('APP_INITIALIZATION', {
    message: 'Iniciando LexiDecis...',
    steps: [
        'Verificar Status do Sistema',
        'Autenticação',
        'Carregar Endpoints',
        'Pré-carregar GPTs',
        'Inicializar Chatbot'
    ]
});

// Marcar etapas como concluídas
LoadingUtils.step(loadingId, 'Verificar Status do Sistema', 'completed');
LoadingUtils.step(loadingId, 'Autenticação', 'completed');

// Finalizar
LoadingUtils.hide(loadingId);
```

### 2. Loading de Chat com Progresso

```javascript
const loadingId = LoadingUtils.show('CHAT_LOADING', {
    message: 'Carregando histórico...',
    showProgress: true,
    allowCancel: true
});

// Simular progresso
let progress = 0;
const interval = setInterval(() => {
    progress += 10;
    LoadingUtils.progress(loadingId, progress, `Carregando... ${progress}%`);
    
    if (progress >= 100) {
        clearInterval(interval);
        LoadingUtils.hide(loadingId);
    }
}, 500);
```

### 3. Loading Inline para Componentes

```javascript
// Criar loading inline
const loadingElement = LoadingUtils.inline('MESSAGE_SENDING', {
    message: 'Enviando...'
});

// Adicionar ao DOM
document.querySelector('.chat-container').appendChild(loadingElement);

// Remover automaticamente quando elemento for removido do DOM
```

### 4. Loading de Processamento de Arquivo

```javascript
const loadingId = LoadingUtils.show('FILE_PROCESSING', {
    message: 'Processando arquivo...',
    showProgress: true,
    allowCancel: true
});

// Simular upload
const file = event.target.files[0];
const reader = new FileReader();

reader.onprogress = (event) => {
    if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        LoadingUtils.progress(loadingId, progress, `Enviando ${file.name}...`);
    }
};

reader.onload = () => {
    LoadingUtils.hide(loadingId);
    // Processar arquivo
};
```

## Configuração Personalizada

### Cores e Estilo

```javascript
const loadingManager = new UnifiedLoadingManager({
    primaryColor: '#3B81F6',
    secondaryColor: '#1E40AF',
    successColor: '#10B981',
    errorColor: '#EF4444',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    animationDuration: 300
});
```

### Contextos Personalizados

```javascript
// Adicionar novo contexto
loadingManager.contexts.CUSTOM_LOADING = {
    name: 'Operação Personalizada',
    type: 'overlay',
    showProgress: true,
    showSteps: true,
    allowCancel: true,
    timeout: 30000
};

// Usar contexto personalizado
const loadingId = LoadingUtils.show('CUSTOM_LOADING', {
    message: 'Executando operação...'
});
```

## Eventos

O sistema emite eventos customizados que podem ser escutados:

```javascript
// Escutar eventos de loading
document.addEventListener('unifiedLoading:loadingComplete', (event) => {
    const { loadingId, context, options } = event.detail;
    console.log(`Loading ${context} finalizado:`, options);
});

// Escutar cancelamento
document.addEventListener('unifiedLoading:loadingCancelled', (event) => {
    const { loadingId, context } = event.detail;
    console.log(`Loading ${context} cancelado pelo usuário`);
});
```

## Atalhos de Teclado

- **ESC**: Cancela todos os loadings ativos (quando habilitado)

## Acessibilidade

O sistema inclui suporte completo para acessibilidade:

- **ARIA Labels**: Atributos apropriados para leitores de tela
- **Foco**: Gerenciamento automático de foco
- **Navegação por Teclado**: Suporte para navegação sem mouse
- **Contraste**: Cores com contraste adequado

## Migração do Sistema Antigo

### Antes (Sistema Fragmentado)

```javascript
// LoadingScreen antigo
const loadingScreen = new LoadingScreen();
loadingScreen.show(['Etapa 1', 'Etapa 2']);
await loadingScreen.loadModel('Etapa 1');
loadingScreen.hide();

// Chat loading antigo
document.getElementById('chatLoadingIndicator').classList.add('show');
```

### Depois (Sistema Unificado)

```javascript
// Sistema unificado
const loadingId = LoadingUtils.show('APP_INITIALIZATION', {
    steps: ['Etapa 1', 'Etapa 2']
});
LoadingUtils.step(loadingId, 'Etapa 1', 'completed');
LoadingUtils.hide(loadingId);

// Chat loading unificado
const chatLoadingId = LoadingUtils.show('CHAT_LOADING', {
    message: 'Carregando chat...'
});
```

## Estatísticas e Monitoramento

```javascript
// Obter estatísticas do sistema
const stats = loadingManager.getStats();
console.log('Loadings ativos:', stats.activeLoadings);
console.log('Total de loadings:', stats.totalLoadings);
console.log('Contextos disponíveis:', stats.contexts);
```

## Troubleshooting

### Problema: Loading não aparece
- Verifique se o `UnifiedLoadingManager` foi inicializado
- Confirme se o contexto existe
- Verifique se há erros no console

### Problema: Loading não desaparece
- Verifique se o `loadingId` está correto
- Confirme se `LoadingUtils.hide()` foi chamado
- Verifique se há exceções não tratadas

### Problema: Performance
- Evite múltiplos loadings simultâneos desnecessários
- Use timeouts apropriados
- Monitore o número de loadings ativos

## Compatibilidade

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers

## Contribuição

Para adicionar novos recursos ao sistema de loading:

1. Adicione novos contextos em `this.contexts`
2. Implemente novos métodos na classe `UnifiedLoadingManager`
3. Atualize a documentação
4. Adicione testes se necessário

---

**Sistema Unificado de Loading - LexiDecis v1.0**
*Desenvolvido para consolidar e melhorar a experiência de loading da aplicação* 