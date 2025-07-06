# Chat LexiDecis v2 - Estrutura Modular

## Visão Geral

Esta é a versão refatorada da aplicação de chat do LexiDecis, seguindo boas práticas de desenvolvimento frontend com estrutura modular, separação de responsabilidades e código mais limpo e maintível.

## Estrutura do Projeto

```
chat/
├── src/                          # Código fonte organizado
│   ├── components/               # Componentes reutilizáveis
│   │   └── sidebar.component.js  # Componente do sidebar
│   ├── config/                   # Configurações
│   │   └── api.config.js         # Configurações de API
│   ├── layouts/                  # Layouts da aplicação
│   ├── services/                 # Serviços de negócio
│   │   ├── api.base.service.js   # Serviço base para APIs
│   │   ├── gpt.service.js        # Serviço de GPTs
│   │   └── chat.service.js       # Serviço de chats
│   ├── styles/                   # Estilos organizados
│   │   ├── base/                 # Estilos base
│   │   │   └── variables.css     # Variáveis CSS
│   │   ├── components/           # Estilos de componentes
│   │   │   └── sidebar.css       # Estilos do sidebar
│   │   └── layouts/              # Estilos de layouts
│   │       └── chat.layout.css   # Layout do chat
│   ├── utils/                    # Utilitários
│   └── main.js                   # Arquivo principal
├── assets/                       # Assets originais (compatibilidade)
│   ├── css/
│   │   └── color-chat.css        # Tema de cores
│   └── js/
│       ├── api.js                # API original (a ser migrada)
│       ├── auth.js               # Autenticação
│       ├── firebase.js           # Firebase
│       ├── status-indicator.js   # Indicador de status
│       └── web.js                # Widget Flowise
├── public/                       # Arquivos públicos
│   └── assets/
│       ├── images/
│       └── fonts/
├── index.html                    # HTML principal refatorado
├── login.html                    # Página de login
└── README.md                     # Esta documentação
```

## Principais Melhorias

### 1. **Modularização**
- Código dividido em módulos específicos por funcionalidade
- Separação clara de responsabilidades
- Componentes reutilizáveis

### 2. **Estrutura Organizada**
- Arquivos organizados por tipo e funcionalidade
- Nomenclatura consistente e descritiva
- Hierarquia clara de diretórios

### 3. **Serviços Especializados**
- `ApiBaseService`: Serviço base com retry, timeout e tratamento de erros
- `GptService`: Gerenciamento de GPTs com métodos utilitários
- `ChatService`: Gerenciamento de chats e histórico

### 4. **Componentes UI**
- `SidebarComponent`: Componente completo do sidebar com eventos
- Sistema de observadores para comunicação entre componentes
- Renderização otimizada de listas

### 5. **CSS Organizado**
- Variáveis CSS centralizadas
- Estilos por componente
- Responsividade aprimorada
- Suporte a tema escuro

### 6. **Configurações Centralizadas**
- Endpoints de API em arquivo único
- Configurações do Flowise organizadas
- Fácil manutenção e atualização

## Principais Classes e Serviços

### ChatApplication (main.js)
Classe principal que coordena toda a aplicação:
- Gerencia estado global
- Inicializa serviços e componentes
- Coordena comunicação entre módulos

### ApiBaseService
Serviço base para todas as requisições HTTP:
- Retry automático com exponential backoff
- Timeout configurável
- Tratamento de erros padronizado
- Interceptação de requisições

### GptService
Serviço especializado para GPTs:
- CRUD de GPTs
- Mapeamento e busca
- Estatísticas e filtros
- Cache de configurações

### ChatService
Serviço para gerenciamento de chats:
- Listagem e busca de chats
- Histórico de mensagens
- Normalização de dados
- Integração com localStorage

### SidebarComponent
Componente UI do sidebar:
- Gerenciamento de estado visual
- Renderização de listas
- Eventos de usuário
- Responsividade

## Configuração e Uso

### Instalação
Não há dependências npm. O projeto usa CDNs para bibliotecas externas.

### Execução
1. Sirva os arquivos em um servidor web
2. Acesse `index.html` diretamente
3. Faça login com suas credenciais

### Desenvolvimento
1. Edite os arquivos na pasta `src/`
2. Estilos estão organizados em `src/styles/`
3. Use o navegador para testar (suporte a ES6 modules)

## Recursos Implementados

### ✅ Funcionalidades Principais
- [x] Autenticação com Firebase
- [x] Lista de chats com busca
- [x] Lista de GPTs organizados
- [x] Integração com Flowise
- [x] Histórico de mensagens
- [x] Sidebar responsivo
- [x] Tema escuro/claro

### ✅ Melhorias Técnicas
- [x] Código modular e organizado
- [x] Separação de responsabilidades
- [x] Tratamento de erros robusto
- [x] Cache de configurações
- [x] Otimizações de performance
- [x] Acessibilidade melhorada

### ✅ UX/UI
- [x] Interface limpa e moderna
- [x] Navegação intuitiva
- [x] Feedback visual apropriado
- [x] Responsividade para mobile
- [x] Animações suaves

## Compatibilidade

### Navegadores Suportados
- Chrome/Edge 85+
- Firefox 80+
- Safari 14+

### Características Técnicas
- ES6 Modules nativos
- CSS Custom Properties
- Flexbox e Grid
- Async/Await

## Próximos Passos

### 🔄 Migração Gradual
1. Migrar funcionalidades restantes do `api.js` original
2. Implementar testes unitários
3. Adicionar TypeScript para melhor tipagem
4. Implementar PWA features

### 🚀 Novas Funcionalidades
- Sistema de notificações
- Busca avançada
- Filtros por categoria
- Exportação de conversas
- Configurações do usuário

## Contribuição

Para contribuir com o projeto:
1. Siga a estrutura modular existente
2. Adicione documentação JSDoc
3. Mantenha consistência no código
4. Teste em diferentes navegadores

## Licença

Este projeto é parte do sistema LexiDecis e segue as políticas internas da empresa. 