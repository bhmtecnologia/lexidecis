# 🧪 Testes do LexiDecis

Esta pasta contém todos os arquivos de teste do projeto LexiDecis, organizados por categoria para facilitar a manutenção e execução.

## 📁 Estrutura de Pastas

```
tests/
├── README.md                    # Este arquivo
├── error-handling/              # Testes de tratamento de erros
│   ├── COMO_TESTAR.md          # Documentação de como testar
│   ├── interactive-test.html   # Teste interativo de erros
│   └── test-quick.js           # Testes rápidos de erro
├── integration-tests/           # Testes de integração
│   └── test-integration.html   # Teste de integração do UIManager
├── ui-tests/                    # Testes de interface do usuário
│   ├── TESTE_SIDEBAR_MOBILE.md # Documentação de testes mobile
│   ├── test-sidebar-mobile.html # Teste da sidebar em dispositivos móveis
│   └── test-toggle.html        # Teste de toggle da sidebar
└── debug/                       # Testes de debug
    └── test-sidebar-debug.html # Teste de debug da sidebar
```

## 🎯 Tipos de Teste

### **Error Handling** (`error-handling/`)
- **Propósito**: Testar tratamento de erros e exceções
- **Uso**: Verificar robustez do sistema
- **Como executar**: Abrir `interactive-test.html` no navegador

### **Integration Tests** (`integration-tests/`)
- **Propósito**: Testar integração entre módulos
- **Uso**: Verificar se UIManager, Auth, Renderer funcionam juntos
- **Como executar**: Abrir `test-integration.html` no navegador

### **UI Tests** (`ui-tests/`)
- **Propósito**: Testar componentes de interface
- **Uso**: Verificar responsividade e funcionalidade da UI
- **Como executar**: Abrir arquivos HTML no navegador

### **Debug Tests** (`debug/`)
- **Propósito**: Debugging específico de componentes
- **Uso**: Identificar problemas em funcionalidades específicas
- **Como executar**: Abrir arquivos HTML no navegador

## 🚀 Como Executar os Testes

### **1. Teste de Integração (Recomendado)**
```bash
# Abrir no navegador
open tests/integration-tests/test-integration.html
```

### **2. Teste de UI Mobile**
```bash
# Abrir no navegador (preferencialmente em modo mobile)
open tests/ui-tests/test-sidebar-mobile.html
```

### **3. Teste de Debug**
```bash
# Abrir no navegador
open tests/debug/test-sidebar-debug.html
```

### **4. Teste de Tratamento de Erros**
```bash
# Abrir no navegador
open tests/error-handling/interactive-test.html
```

## 📋 Checklist de Testes

### **Antes de cada Deploy:**
- [ ] Executar teste de integração
- [ ] Testar sidebar em dispositivos móveis
- [ ] Verificar tratamento de erros
- [ ] Testar funcionalidades principais

### **Após Mudanças no UIManager:**
- [ ] Executar `test-integration.html`
- [ ] Verificar todos os botões funcionam
- [ ] Testar menu do usuário
- [ ] Verificar sidebar mobile

### **Após Mudanças na UI:**
- [ ] Executar `test-sidebar-mobile.html`
- [ ] Testar responsividade
- [ ] Verificar animações
- [ ] Testar em diferentes tamanhos de tela

## 🔧 Desenvolvimento

### **Adicionando Novos Testes:**
1. Identificar a categoria apropriada
2. Criar arquivo na pasta correta
3. Seguir convenção de nomenclatura: `test-[funcionalidade].html`
4. Documentar no README se necessário

### **Convenções de Nomenclatura:**
- **Arquivos de teste**: `test-[funcionalidade].html`
- **Documentação**: `[FUNCIONALIDADE]_TESTE.md`
- **Scripts**: `test-[funcionalidade].js`

## 📝 Notas Importantes

- Todos os testes devem funcionar independentemente
- Manter compatibilidade com diferentes navegadores
- Documentar mudanças que afetem os testes
- Atualizar este README quando adicionar novos testes

## 🐛 Reportando Problemas

Se encontrar problemas nos testes:
1. Verificar console do navegador
2. Documentar passos para reproduzir
3. Incluir informações do navegador e sistema
4. Criar issue no repositório

---

**Última atualização**: $(date)
**Versão**: 1.0 