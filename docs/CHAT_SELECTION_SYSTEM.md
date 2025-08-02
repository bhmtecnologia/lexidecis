# Sistema de Seleção Visual de Chats

## Visão Geral

O sistema de seleção visual de chats permite que o usuário identifique claramente qual chat está atualmente selecionado na lista lateral, proporcionando feedback visual consistente e persistente.

## Funcionalidades

### ✅ Efeito Visual
- **Estado Selecionado**: Chat ativo fica com fundo cinza escuro (`#343a40`)
- **Consistência**: Mesmo efeito visual do hover, mas permanente
- **Sutil**: Não chama atenção excessiva, mantém elegância

### ✅ Persistência
- **localStorage**: Seleção salva automaticamente
- **URL**: Parâmetro `chatId` mantido na URL
- **Restauração**: Seleção recuperada após recarregar página

### ✅ Interação
- **Clique**: Seleciona chat e aplica efeito visual
- **Troca**: Seleção muda automaticamente ao clicar em outro chat
- **Limpeza**: Estado anterior removido ao selecionar novo chat

## Implementação Técnica

### 1. JavaScript (ChatManager)

#### Função Principal: `selectChatItem(chatId)`
```javascript
selectChatItem(chatId) {
    const chatItems = Array.from(document.querySelectorAll('#chat-list .list-group-item.chat-item'))
        .filter(item => item.dataset.chatId);

    chatItems.forEach(item => {
        const itemChatId = item.dataset.chatId;
        if (itemChatId === chatId) {
            item.classList.add('active');
            localStorage.setItem('selectedChatId', chatId);
            this.updateUrlWithChatId(chatId);
        } else {
            item.classList.remove('active');
        }
    });
}
```

#### Função de Restauração: `restoreChatSelection()`
```javascript
restoreChatSelection() {
    const urlParams = new URLSearchParams(window.location.search);
    const chatIdFromUrl = urlParams.get('chatId');
    const chatIdFromStorage = localStorage.getItem('selectedChatId');
    const chatIdToSelect = chatIdFromUrl || chatIdFromStorage;
    
    if (chatIdToSelect) {
        this.selectChatItem(chatIdToSelect);
    }
}
```

#### Integração: `populateChatMenu()`
```javascript
populateChatMenu(chatsToDisplay) {
    // ... código de população da lista ...
    chatList.appendChild(fragment);
    
    // Restaura a seleção do chat após popular a lista
    this.restoreChatSelection();
}
```

### 2. CSS (Sidebar)

#### Regras de Seleção
```css
.lexi-chat-list .list-group-item.active,
#chat-list .list-group-item.active,
#sidebarMenu .lexi-chat-list .list-group-item.active {
    background-color: #343a40 !important;
    color: white !important;
    border-color: #495057 !important;
}
```

#### Regras de Hover (para comparação)
```css
.lexi-chat-list .list-group-item:hover {
    background-color: #343a40 !important;
}
```

### 3. Estrutura HTML

#### Elemento de Chat
```html
<li class="list-group-item chat-item d-flex justify-content-between align-items-center" 
    data-chat-id="123">
    <span class="chat-name">Nome do Chat</span>
    <div class="dropdown">
        <!-- Botões de opções -->
    </div>
</li>
```

## Fluxo de Funcionamento

### 1. Carregamento Inicial
```
1. Página carrega
2. ChatManager.populateChatMenu() é chamado
3. Lista de chats é renderizada
4. restoreChatSelection() é executado
5. Seleção é restaurada da URL ou localStorage
```

### 2. Clique em Chat
```
1. Usuário clica em um chat
2. handleChatClick() é executado
3. selectChatItem() é chamado
4. Classe 'active' é adicionada ao chat clicado
5. Classe 'active' é removida dos outros chats
6. Seleção é salva no localStorage
7. URL é atualizada com chatId
```

### 3. Recarregamento de Página
```
1. Página é recarregada
2. Lista de chats é populada novamente
3. restoreChatSelection() é executado
4. Seleção é recuperada da URL ou localStorage
5. Efeito visual é aplicado automaticamente
```

## Arquivos Modificados

### `services/chatManager.js`
- ✅ Corrigido seletor CSS para elementos de chat
- ✅ Implementada função `selectChatItem()`
- ✅ Implementada função `restoreChatSelection()`
- ✅ Integrada restauração automática

### `styles/sidebar.css`
- ✅ Adicionadas regras CSS para estado `active`
- ✅ Implementada especificidade para sobrescrever Bootstrap
- ✅ Mantida consistência visual com hover

### `test-chat-selection.html` (novo)
- ✅ Arquivo de teste para verificar funcionalidade
- ✅ Demonstração do efeito de seleção

## Resolução de Problemas

### Problema: Bootstrap Sobrescrevendo CSS
**Sintoma**: Efeito visual não aparece
**Causa**: Bootstrap tem regra `.list-group-item.active`
**Solução**: Usar seletores mais específicos com `!important`

### Problema: Seleção Não Persiste
**Sintoma**: Seleção perdida ao recarregar
**Causa**: Função de restauração não chamada
**Solução**: Integrar `restoreChatSelection()` em `populateChatMenu()`

### Problema: Elementos Não Encontrados
**Sintoma**: JavaScript não encontra chats
**Causa**: Seletor CSS incorreto
**Solução**: Usar `#chat-list .list-group-item.chat-item`

## Testes

### Teste Manual
1. Abrir `pages/chat.html`
2. Clicar em diferentes chats
3. Verificar efeito visual
4. Recarregar página
5. Verificar persistência

### Teste Automatizado
1. Abrir `test-chat-selection.html`
2. Usar botões de teste
3. Verificar comportamento

## Manutenção

### Adicionar Novos Estados
```css
.lexi-chat-list .list-group-item.active {
    /* Estado atual */
}

.lexi-chat-list .list-group-item.loading {
    /* Novo estado para loading */
}
```

### Modificar Comportamento
```javascript
selectChatItem(chatId) {
    // Lógica atual
    // Adicionar nova lógica aqui
}
```

### Debugging
```javascript
// Adicionar logs para debug
console.log('Chat selecionado:', chatId);
console.log('Elementos encontrados:', chatItems.length);
```

## Compatibilidade

- ✅ **Bootstrap 5.3.0**: Compatível com regras CSS específicas
- ✅ **Navegadores Modernos**: localStorage e URLSearchParams
- ✅ **Dispositivos Móveis**: Touch events funcionam normalmente
- ✅ **Acessibilidade**: Estados visuais claros

## Próximas Melhorias

### Possíveis Expansões
1. **Animações**: Transições suaves entre estados
2. **Múltipla Seleção**: Selecionar vários chats
3. **Atalhos de Teclado**: Navegação com setas
4. **Indicadores Visuais**: Ícones ou badges
5. **Temas**: Diferentes cores para diferentes temas

### Considerações de Performance
- Seletores CSS otimizados
- Event listeners eficientes
- localStorage com limites de tamanho
- Debounce para atualizações de URL

---

**Última Atualização**: Dezembro 2024  
**Versão**: 1.0  
**Responsável**: Sistema de Seleção Visual de Chats 