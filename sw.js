// KILL-SWITCH SERVICE WORKER — LexiDecis v4.0.0
//
// O PWA foi descontinuado. Este service worker existe apenas para
// desinstalar as versões anteriores (lexidecis-v3.x) dos navegadores
// dos usuários: ele assume o controle, apaga todos os caches,
// desregistra a si mesmo e recarrega as abas abertas.
//
// IMPORTANTE: este arquivo deve permanecer publicado em /sw.js por
// pelo menos 30 dias após o deploy, para alcançar todos os clientes
// que ainda têm o SW antigo instalado. Só depois disso pode ser
// removido do servidor.

self.addEventListener('install', () => {
  // Ativa imediatamente, sem esperar as abas fecharem
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Apaga TODOS os caches deste escopo (lexidecis-v3.x e quaisquer outros)
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // Desregistra este service worker
      await self.registration.unregister();

      // Recarrega as janelas controladas para que voltem a falar
      // direto com o servidor, sem cache
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});

// Sem handler de fetch: todas as requisições vão direto à rede.
