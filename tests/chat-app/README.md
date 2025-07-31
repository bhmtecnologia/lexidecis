# 🧪 Testes da Aplicação Chat - LexiDecis

Esta pasta contém testes abrangentes para a aplicação `pages/chat.html`, organizados por categoria e funcionalidade.

## 📁 Estrutura de Testes

```
tests/chat-app/
├── README.md                           # Este arquivo
├── unit/                               # Testes unitários
│   ├── services/                       # Testes dos serviços
│   │   ├── stateManager.test.html     # Testes do StateManager
│   │   ├── chatManager.test.html      # Testes do ChatManager
│   │   ├── uiManager.test.html        # Testes do UIManager
│   │   ├── gptManager.test.html       # Testes do GPTManager
│   │   └── apiService.test.html       # Testes do ApiService
│   └── components/                     # Testes de componentes
│       ├── sidebar.test.html          # Testes da sidebar
│       ├── chatInterface.test.html    # Testes da interface de chat
│       └── loadingSystem.test.html    # Testes do sistema de loading
├── integration/                        # Testes de integração
│   ├── chatWorkflow.test.html         # Fluxo completo de chat
│   ├── authIntegration.test.html      # Integração com autenticação
│   ├── gptSelection.test.html         # Seleção e troca de GPTs
│   └── statePersistence.test.html     # Persistência de estado
├── e2e/                               # Testes end-to-end
│   ├── userJourney.test.html          # Jornada completa do usuário
│   ├── mobileResponsiveness.test.html # Responsividade mobile
│   └── errorHandling.test.html        # Tratamento de erros
├── performance/                        # Testes de performance
│   ├── loadTime.test.html             # Tempo de carregamento
│   ├── memoryUsage.test.html          # Uso de memória
│   └── chatHistory.test.html          # Performance do histórico
└── utils/                             # Utilitários de teste
    ├── testHelpers.js                 # Funções auxiliares
    ├── mockData.js                    # Dados mock para testes
    └── testConfig.js                  # Configurações de teste
```

## 🎯 Categorias de Teste

### **1. Testes Unitários** (`unit/`)
- **Propósito**: Testar componentes individuais isoladamente
- **Cobertura**: Serviços, componentes, funções específicas
- **Execução**: Rápida, sem dependências externas

### **2. Testes de Integração** (`integration/`)
- **Propósito**: Testar interação entre módulos
- **Cobertura**: Fluxos de trabalho, comunicação entre serviços
- **Execução**: Média, com dependências internas

### **3. Testes End-to-End** (`e2e/`)
- **Propósito**: Testar cenários completos do usuário
- **Cobertura**: Jornadas completas, responsividade, tratamento de erros
- **Execução**: Lenta, simula uso real

### **4. Testes de Performance** (`performance/`)
- **Propósito**: Verificar performance e otimizações
- **Cobertura**: Tempo de carregamento, uso de memória, escalabilidade
- **Execução**: Específica para métricas de performance

## 🚀 Como Executar

### **Execução Individual:**
```bash
# Teste unitário específico
open tests/chat-app/unit/services/stateManager.test.html

# Teste de integração
open tests/chat-app/integration/chatWorkflow.test.html

# Teste E2E
open tests/chat-app/e2e/userJourney.test.html
```

### **Execução em Sequência:**
```bash
# Executar todos os testes unitários
./tests/chat-app/run-unit-tests.sh

# Executar todos os testes de integração
./tests/chat-app/run-integration-tests.sh

# Executar todos os testes
./tests/chat-app/run-all-tests.sh
```

## 📋 Checklist de Testes

### **Antes de cada Deploy:**
- [ ] Executar testes unitários (todos passando)
- [ ] Executar testes de integração (fluxos críticos)
- [ ] Executar testes E2E (jornadas principais)
- [ ] Verificar testes de performance (dentro dos limites)

### **Após Mudanças em Serviços:**
- [ ] Executar testes unitários do serviço modificado
- [ ] Executar testes de integração relacionados
- [ ] Verificar impacto em outros módulos

### **Após Mudanças na UI:**
- [ ] Executar testes de componentes
- [ ] Executar testes de responsividade
- [ ] Verificar acessibilidade

## 🔧 Desenvolvimento de Testes

### **Criando Novos Testes:**
1. Identificar a categoria apropriada
2. Seguir o padrão de nomenclatura: `[componente].test.html`
3. Incluir documentação no README se necessário
4. Adicionar ao script de execução correspondente

### **Padrões de Teste:**
- **Setup**: Preparar ambiente e dados de teste
- **Execute**: Executar a funcionalidade sendo testada
- **Assert**: Verificar resultados esperados
- **Teardown**: Limpar dados de teste

### **Mocking e Stubbing:**
- Usar `mockData.js` para dados consistentes
- Mockar APIs externas quando necessário
- Isolar dependências para testes unitários

## 📊 Métricas de Qualidade

### **Cobertura de Testes:**
- **Unitários**: >90% das funções públicas
- **Integração**: Todos os fluxos críticos
- **E2E**: Jornadas principais do usuário

### **Performance:**
- **Tempo de carregamento**: <3s
- **Uso de memória**: <100MB
- **Responsividade**: Funciona em dispositivos móveis

### **Confiabilidade:**
- **Taxa de sucesso**: >95%
- **Falsos positivos**: <5%
- **Tempo de execução**: <30s para suite completa

## 🐛 Reportando Problemas

Para reportar problemas nos testes:
1. Documentar passos para reproduzir
2. Incluir logs do console
3. Especificar ambiente (navegador, sistema)
4. Criar issue com template de bug

---

**Última atualização**: $(date)
**Versão**: 1.0
**Cobertura**: Aplicação Chat LexiDecis 