/**
 * Gerenciador de Cache para LexiDecis PWA
 * Resolve problemas de cache desatualizado automaticamente
 */

class LexiDecisCacheManager {
    constructor() {
        this.isInitialized = false;
        this.cacheStatus = {
            isOnline: navigator.onLine,
            lastUpdate: null,
            cacheVersion: '1.1.0',
            hasIssues: false
        };

        this.init();
    }

    init() {
        if (this.isInitialized) return;

        console.log('[CacheManager] Inicializando gerenciador de cache...');

        // Detectar problemas de carregamento
        this.detectLoadingIssues();

        // Monitorar status da conexão
        this.monitorConnection();

        // Verificar cache periodicamente
        this.scheduleCacheCheck();

        // Adicionar botão de emergência para resolver problemas
        this.addEmergencyButton();

        this.isInitialized = true;
        console.log('[CacheManager] Gerenciador de cache inicializado para:', window.location.pathname);
    }

    // Identifica recursos críticos baseados na página atual
    getCriticalResourcesForPage() {
        const currentPath = window.location.pathname;
        const baseResources = [
            '/manifest.json'
        ];

        // Recursos específicos por página
        if (currentPath.includes('login.html')) {
            return [
                ...baseResources,
                'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
                'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
                'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
                'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js',
                'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Roboto:wght@400;500&display=swap',
                '../services/login.js',
                '/styles/login-offline.css'
            ];
        } else if (currentPath.includes('index.html') || currentPath === '/') {
            return [
                ...baseResources,
                '/styles/chat.css',
                '/styles/sidebar.css',
                'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Roboto:wght@400;500&display=swap',
                'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
            ];
        } else if (currentPath.includes('chat.html')) {
            return [
                ...baseResources,
                '/styles/chat.css',
                '/styles/sidebar.css',
                '/styles/loadingScreen.css'
            ];
        }

        // Padrão para outras páginas
        return baseResources;
    }

    // Detecta problemas de carregamento da página
    detectLoadingIssues() {
        // Verificar se recursos críticos carregaram corretamente
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.checkCriticalResources();
            }, 1000);
        });

        // Detectar erros de carregamento de recursos
        window.addEventListener('error', (event) => {
            if (event.target.tagName === 'LINK' || event.target.tagName === 'SCRIPT') {
                console.warn('[CacheManager] Erro ao carregar recurso:', event.target.src || event.target.href);
                this.handleResourceError(event);
            }
        });
    }

    // Verifica se recursos críticos estão carregados corretamente
    checkCriticalResources() {
        const criticalResources = this.getCriticalResourcesForPage();

        let failedResources = [];

        const checkPromises = criticalResources.map(resource => {
            return fetch(resource, { method: 'HEAD' })
                .then(response => {
                    if (!response.ok) {
                        failedResources.push(resource);
                        console.warn(`[CacheManager] Recurso crítico falhou: ${resource}`);
                    }
                })
                .catch(error => {
                    failedResources.push(resource);
                    console.warn(`[CacheManager] Erro ao verificar recurso: ${resource}`, error);
                });
        });

        Promise.all(checkPromises).then(() => {
            if (failedResources.length > 0) {
                console.error('[CacheManager] Recursos críticos com problemas:', failedResources);
                this.cacheStatus.hasIssues = true;
                this.showCacheIssueNotification(failedResources);
            } else {
                console.log('[CacheManager] Todos os recursos críticos OK');
                this.cacheStatus.lastUpdate = new Date();
            }
        });
    }

    // Monitora status da conexão
    monitorConnection() {
        window.addEventListener('online', () => {
            console.log('[CacheManager] Conexão restaurada');
            this.cacheStatus.isOnline = true;
            // Verificar se cache precisa ser atualizado após reconexão
            setTimeout(() => {
                this.checkForUpdates();
            }, 2000);
        });

        window.addEventListener('offline', () => {
            console.log('[CacheManager] Conexão perdida');
            this.cacheStatus.isOnline = false;
        });
    }

    // Verifica se há atualizações disponíveis
    checkForUpdates() {
        if (!this.cacheStatus.isOnline) return;

        console.log('[CacheManager] Verificando atualizações...');

        // Verificar se o Service Worker tem uma versão mais nova
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then(registration => {
                if (registration) {
                    registration.update().then(() => {
                        console.log('[CacheManager] Service Worker atualizado');
                    }).catch(error => {
                        console.warn('[CacheManager] Erro ao atualizar SW:', error);
                    });
                }
            });
        }
    }

    // Agenda verificação periódica do cache
    scheduleCacheCheck() {
        // Verificar a cada 5 minutos se está online
        setInterval(() => {
            if (this.cacheStatus.isOnline) {
                this.checkCriticalResources();
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    // Trata erros de carregamento de recursos
    handleResourceError(event) {
        const resourceUrl = event.target.src || event.target.href;

        // Se for um recurso crítico, tentar recarregar
        if (resourceUrl && resourceUrl.includes('/styles/')) {
            console.log('[CacheManager] Tentando recarregar recurso crítico:', resourceUrl);

            // Forçar recarregamento adicionando timestamp
            const separator = resourceUrl.includes('?') ? '&' : '?';
            const newUrl = resourceUrl + separator + '_cache=' + Date.now();

            if (event.target.tagName === 'LINK') {
                event.target.href = newUrl;
            } else if (event.target.tagName === 'SCRIPT') {
                const newScript = document.createElement('script');
                newScript.src = newUrl;
                document.head.appendChild(newScript);
                event.target.remove();
            }
        }
    }

    // Mostra notificação sobre problemas de cache
    showCacheIssueNotification(failedResources) {
        // Criar notificação de problema
        const notification = document.createElement('div');
        notification.className = 'cache-issue-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff6b6b;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                font-family: Arial, sans-serif;
                font-size: 14px;
            ">
                <strong>⚠️ Problema de Cache Detectado</strong><br>
                Alguns recursos podem estar desatualizados.<br>
                <button onclick="cacheManager.forceCacheUpdate()" style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    margin-top: 10px;
                    cursor: pointer;
                ">Atualizar Cache</button>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    margin-left: 10px;
                    cursor: pointer;
                    opacity: 0.7;
                ">✕</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover após 30 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }

    // Adiciona botão de emergência (oculto por padrão)
    addEmergencyButton() {
        // Criar botão de emergência (invisível por padrão)
        const emergencyBtn = document.createElement('button');
        emergencyBtn.id = 'cache-emergency-btn';
        emergencyBtn.innerHTML = '🔄';
        emergencyBtn.title = 'Forçar atualização do cache (pressione Ctrl+Shift+R duas vezes)';
        emergencyBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(0,123,255,0.8);
            color: white;
            border: none;
            cursor: pointer;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 18px;
        `;

        // Mostrar botão quando Ctrl+Shift+R for pressionado duas vezes rapidamente
        let keySequence = [];
        let lastKeyTime = 0;

        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                const now = Date.now();
                keySequence.push(now);

                // Manter apenas as últimas 2 teclas
                if (keySequence.length > 2) {
                    keySequence.shift();
                }

                // Se duas teclas foram pressionadas em menos de 500ms
                if (keySequence.length === 2 && (now - keySequence[0]) < 500) {
                    emergencyBtn.style.opacity = '1';
                    setTimeout(() => {
                        emergencyBtn.style.opacity = '0';
                    }, 3000);
                }

                lastKeyTime = now;
            }
        });

        emergencyBtn.addEventListener('click', () => {
            this.forceCacheUpdate();
        });

        document.body.appendChild(emergencyBtn);
    }

    // Força atualização do cache
    async forceCacheUpdate() {
        console.log('[CacheManager] Forçando atualização do cache...');

        try {
            // Mostrar loading
            this.showLoadingIndicator();

            // Comunicar com Service Worker
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const channel = new MessageChannel();

                navigator.serviceWorker.controller.postMessage(
                    { type: 'FORCE_CACHE_UPDATE' },
                    [channel.port2]
                );

                await new Promise((resolve, reject) => {
                    channel.port1.onmessage = (event) => {
                        if (event.data.type === 'CACHE_UPDATED') {
                            if (event.data.success) {
                                resolve();
                            } else {
                                reject(new Error(event.data.error));
                            }
                        }
                    };

                    // Timeout de 10 segundos
                    setTimeout(() => {
                        reject(new Error('Timeout ao atualizar cache'));
                    }, 10000);
                });

                console.log('[CacheManager] Cache atualizado com sucesso!');

                // Recarregar página após atualização
                setTimeout(() => {
                    window.location.reload();
                }, 1000);

            } else {
                throw new Error('Service Worker não disponível');
            }

        } catch (error) {
            console.error('[CacheManager] Erro ao atualizar cache:', error);
            this.showErrorNotification('Erro ao atualizar cache: ' + error.message);
        } finally {
            this.hideLoadingIndicator();
        }
    }

    // Mostra indicador de carregamento
    showLoadingIndicator() {
        let indicator = document.getElementById('cache-loading-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'cache-loading-indicator';
            indicator.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                ">
                    <div>
                        <div style="
                            width: 50px;
                            height: 50px;
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #3498db;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 20px;
                        "></div>
                        <strong>Atualizando Cache...</strong><br>
                        <small>Isso pode levar alguns segundos</small>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(indicator);
        }
    }

    // Esconde indicador de carregamento
    hideLoadingIndicator() {
        const indicator = document.getElementById('cache-loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Mostra notificação de erro
    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #e74c3c;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                font-family: Arial, sans-serif;
            ">
                <strong>❌ Erro</strong><br>
                ${message}
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    margin-left: 10px;
                    cursor: pointer;
                    opacity: 0.7;
                ">✕</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover após 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // Método público para acessar status
    getStatus() {
        return { ...this.cacheStatus };
    }
}

// Inicializar gerenciador de cache quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.cacheManager = new LexiDecisCacheManager();
});

// Função global para forçar atualização (pode ser chamada do console)
window.forceCacheUpdate = () => {
    if (window.cacheManager) {
        window.cacheManager.forceCacheUpdate();
    } else {
        console.error('Cache Manager não inicializado');
    }
};
