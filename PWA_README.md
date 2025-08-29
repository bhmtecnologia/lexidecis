# 🚀 LexiDecis PWA - Progressive Web App

Bem-vindo à versão PWA (Progressive Web App) do LexiDecis! Esta aplicação foi completamente transformada para oferecer uma experiência nativa no navegador.

## ✨ Funcionalidades da PWA

### 🔧 Funcionalidades Principais
- **Instalação Nativa**: Instale como um aplicativo nativo no desktop e mobile
- **Funcionamento Offline**: Acesse a aplicação mesmo sem conexão com a internet
- **Cache Inteligente**: Recursos são cacheados para carregamento rápido
- **Notificações Push**: Receba notificações importantes (quando implementado)
- **Sincronização em Background**: Dados são sincronizados automaticamente quando volta online
- **Interface Responsiva**: Funciona perfeitamente em todos os dispositivos

### 🎨 Interface e UX
- **Banner de Instalação**: Aparece automaticamente quando disponível
- **Indicador Offline**: Mostra status da conexão em tempo real
- **Animações Suaves**: Mantém as animações 3D originais com GSAP e Three.js
- **Loading States**: Estados de carregamento para melhor feedback

## 📱 Como Instalar

### Desktop (Chrome/Edge)
1. Abra o site no navegador
2. Clique no ícone de instalação na barra de endereços (📱) ou no banner
3. Clique em "Instalar"
4. O aplicativo será instalado como um app nativo

### Mobile (Android/iOS)
1. Abra o site no navegador móvel
2. Toque em "Adicionar à Tela Inicial" ou "Instalar App"
3. Confirme a instalação
4. O ícone aparecerá na tela inicial

## 🔧 Arquivos da PWA

### Arquivos Criados/Modificados
- `manifest.json` - Configurações da PWA (ícones, nome, cores)
- `sw.js` - Service Worker para cache offline
- `offline.html` - Página exibida quando offline
- `index.html` - Página principal com funcionalidades PWA
- `images/icon.svg` - Ícone base em SVG
- `generate-icons.js` - Script para gerar ícones PNG

### Estrutura de Cache
```
lexidecis-static-v1.0.0/
├── index.html
├── manifest.json
├── favicon.ico
├── fonts (Google Fonts)
├── scripts (GSAP, Three.js)

lexidecis-dynamic-v1.0.0/
├── pages/login.html
├── pages/chat.html
├── admin/index.html
```

## 🛠️ Desenvolvimento

### Como Testar a PWA

1. **Servidor Local**:
   ```bash
   # Instalar um servidor local (ex: live-server)
   npm install -g live-server
   live-server
   ```

2. **HTTPS Necessário**: PWAs requerem HTTPS em produção. Para desenvolvimento local:
   - Use `localhost` ou `127.0.0.1`
   - Ou configure um certificado SSL local

3. **Chrome DevTools**:
   - Abra DevTools (F12)
   - Vá para "Application" > "Service Workers"
   - Verifique se o SW está registrado
   - Teste "Offline" no Network tab

### Gerar Ícones

Execute o script de geração de ícones:
```bash
node generate-icons.js
```

Ou use ferramentas online:
- [Favicon.io](https://favicon.io/favicon-converter/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## 📊 Monitoramento

### Verificar Status da PWA

```javascript
// Verificar se está instalado
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

// Verificar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers registrados:', registrations);
  });
}

// Verificar cache
caches.keys().then(cacheNames => {
  console.log('Caches disponíveis:', cacheNames);
});
```

### Logs de Debug

Abra o console do navegador para ver logs da PWA:
- `[PWA]` - Logs da aplicação PWA
- `[SW]` - Logs do Service Worker

## 🔄 Atualizações

### Atualização Automática
- O Service Worker detecta novas versões automaticamente
- Usuários são notificados sobre atualizações disponíveis
- Cache antigo é limpo automaticamente

### Forçar Atualização
```javascript
// No console do navegador
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    registration.update();
  });
});
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **PWA não instala**:
   - Verifique se o site usa HTTPS
   - Certifique-se de que o manifest.json é válido
   - Verifique se os ícones existem nos caminhos corretos

2. **Service Worker não registra**:
   - Verifique se o arquivo sw.js existe
   - Confirme que o servidor suporta Service Workers
   - Verifique erros no console

3. **Cache não funciona**:
   - Limpe o cache do navegador
   - Reinicie o Service Worker
   - Verifique se os recursos estão sendo servidos corretamente

### Limpar Dados da PWA

```javascript
// Limpar todos os caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// Desregistrar Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});
```

## 🎯 Próximos Passos

### Funcionalidades Planejadas
- [ ] Notificações push para mensagens importantes
- [ ] Sincronização de dados em background
- [ ] Cache de imagens e mídia
- [ ] Suporte a múltiplas contas
- [ ] Tema escuro/claro
- [ ] Shortcuts para ações rápidas

### Melhorias de Performance
- [ ] Lazy loading de componentes
- [ ] Compressão de recursos
- [ ] CDN para assets estáticos
- [ ] Service Worker avançado com Workbox

## 📝 Licença

Esta PWA é parte do projeto LexiDecis. Consulte o arquivo principal `README.md` para mais informações sobre licenciamento.

## 🤝 Contribuição

Para contribuir com melhorias na PWA:
1. Teste em múltiplos dispositivos e navegadores
2. Relate bugs com logs detalhados
3. Sugira melhorias na UX
4. Contribua com código seguindo as diretrizes do projeto

---

**Desenvolvido com ❤️ para o LexiDecis**
