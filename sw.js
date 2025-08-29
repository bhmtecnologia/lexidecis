// SERVICE WORKER ULTRA-SIMPLES PARA LEXIDECIS PWA
const CACHE_NAME = 'lexidecis-v3.0.0';
const CACHE_TIMESTAMP = Date.now();

// TODOS os recursos críticos que DEVEM funcionar offline
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/manifest.json',
  '/favicon.ico',
  '/styles/login-offline.css',
  '/cache-manager.js',
  '/services/login.js',
  '/services/auth.js',
  '/services/alertManager.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Roboto:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// INSTALAÇÃO - Cache todos os recursos críticos OBRIGATORIAMENTE
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando e cacheando recursos críticos...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando TODOS os recursos críticos...');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[SW] ✅ Todos os recursos críticos cacheados com sucesso!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] ❌ Erro ao cachear recursos:', error);
        // Mesmo com erro, ativa o SW
        return self.skipWaiting();
      })
  );
});

// ATIVAÇÃO - Limpa caches antigos e assume controle
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] ✅ Service Worker ativado e no controle!');
        return self.clients.claim();
      })
  );
});

// INTERCEPTAÇÃO ULTRA-SIMPLES DE REQUISIÇÕES
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só intercepta GET requests
  if (request.method !== 'GET') return;

  // Ignora Chrome DevTools
  if (request.url.includes('chrome-extension:')) return;

  // ESTRATÉGIA ULTRA-SIMPLES: CACHE FIRST PARA TUDO!
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] ✅ Servindo do cache:', request.url);
          return cachedResponse;
        }

        // Se não está no cache, tenta buscar da rede
        console.log('[SW] 🔄 Buscando da rede:', request.url);
        return fetch(request)
          .then((networkResponse) => {
            // Se a resposta da rede é OK, armazena no cache
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                  console.log('[SW] 💾 Armazenado no cache:', request.url);
                })
                .catch((error) => {
                  console.warn('[SW] Erro ao armazenar no cache:', error);
                });
            }

            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] ❌ Erro na rede:', request.url, error);

            // Para recursos críticos, cria resposta de fallback
            if (request.url.includes('bootstrap.min.css')) {
              console.log('[SW] 🔧 Criando fallback CSS Bootstrap');
              return new Response(`
                .container { max-width: 1200px; margin: 0 auto; padding: 0 15px; }
                .row { display: flex; flex-wrap: wrap; margin: 0 -15px; }
                .col { flex: 1; padding: 0 15px; }
                .d-flex { display: flex !important; }
                .justify-content-center { justify-content: center !important; }
                .align-items-center { align-items: center !important; }
                .text-center { text-align: center !important; }
                .btn { padding: 0.75rem 1.5rem; border: 1px solid transparent; border-radius: 8px; cursor: pointer; }
                .btn-primary { background-color: #1c1d1c; color: white; }
                .form-control { width: 100%; padding: 0.75rem 1rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.15); color: white; }
                .mt-3 { margin-top: 1rem !important; }
                .mb-3 { margin-bottom: 1rem !important; }
                .card { border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
                .card-body { padding: 2rem; }
                .alert { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
                .alert-danger { background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); color: #ff6b7d; }
                .spinner-border { display: inline-block; width: 2rem; height: 2rem; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #1ed760; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
              `, {
                status: 200,
                headers: { 'Content-Type': 'text/css' }
              });
            }

            if (request.url.includes('.js')) {
              console.log('[SW] 🔧 Criando fallback JS vazio');
              return new Response('// Fallback JS - Funcionalidades limitadas', {
                status: 200,
                headers: { 'Content-Type': 'application/javascript' }
              });
            }

            // Para outros recursos, erro 503 (serviço indisponível)
            return new Response('Recurso temporariamente indisponível', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// MENSAGENS DO CLIENTE
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Ativando nova versão...');
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    console.log('[SW] Limpando cache...');
    caches.delete(CACHE_NAME)
      .then(() => event.ports[0]?.postMessage({ success: true }))
      .catch((error) => event.ports[0]?.postMessage({ success: false, error }));
  }
});

// TRATAMENTO DE ERROS
self.addEventListener('error', (event) => {
  console.error('[SW] Erro:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Promessa rejeitada:', event.reason);
});

console.log('[SW] 🚀 Service Worker v3.0.0 inicializado com sucesso!');
