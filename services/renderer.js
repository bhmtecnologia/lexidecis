// renderer.js

import { getLoadingManager, LoadingUtils } from './unifiedLoadingManager.js';
import GPTManager from './gptManager.js';
import { showAlert } from './alertManager.js';
import { showToast } from './notificationManager.js';
import Chatbot from "./web.js";
import ApiService from './apiService.js';
import StateManager from './stateManager.js';
//import HistoryManager from './historyManager.js';
import ChatManager from './chatManager.js';
import UIManager from './uiManager.js';
import StatusCheck from './statusCheck.js';
import { getJwt } from './auth.js';
import './auth.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import presenceService from './presenceService.js';

// Endpoint configuration
const ENDPOINT_URL = 'https://webhook.power.tec.br/webhook/lexidecis/endpoints';
const ENDPOINT_TIMEOUT_MS = 3000;
const ENDPOINT_MAX_RETRIES = 3;

// Importar serviço de log centralizado
import logService from './logService.js';

// Função de compatibilidade com o padrão existente
function debugLog(...args) {
    logService.debug('Renderer', ...args);
}

// Carregamos do sessionStorage (pode ser que não estejam definidos ainda se o usuário não logou)
let tenant = sessionStorage.getItem("tenant");
let uuid = sessionStorage.getItem("uuid");
let email = sessionStorage.getItem("email");

// Config inicial
let CONFIG = {
    userId: uuid,
    companyName: tenant,
    userName: email,
    flowise: {
        chatflowId: '',
        apiHost: '',
        token: ''
    },
    apiCredentials: {}
};

// Flag para abortar o carregamento caso o usuário escolha sair no status
let abortLoading = false;

document.addEventListener('DOMContentLoaded', async () => {
    logService.start('Renderer', 'DOMContentLoaded disparado. Iniciando aplicação');

    // 1) Inicializa o sistema unificado de loading
    const loadingManager = getLoadingManager();
    logService.info('Renderer', 'Sistema unificado de loading inicializado');

    // 2) Instancia StatusCheck para verificar o status do sistema
    const statusCheck = new StatusCheck();
    logService.info('Renderer', 'StatusCheck instanciado');

    // 3) Definimos as etapas de carregamento
    const etapasDeCarregamento = [
        'Verificar Status do Sistema',
        'Autenticação',
        'Carregar Endpoints',
        'Pré-carregar GPTs',
        'Selecionar GPT Padrão',
        'Inicializar Chatbot',
        'Carregar Lista de Chats'
    ];

    // 4) Exibir o loading de inicialização
    const loadingId = LoadingUtils.show('APP_INITIALIZATION', {
        message: 'Iniciando LexiDecis...',
        steps: etapasDeCarregamento
    });
    logService.info('Renderer', 'Loading de inicialização exibido com etapas:', etapasDeCarregamento);

    // Inicia a verificação do status de forma assíncrona
    statusCheck.checkStatus().then(userAgreed => {
        if (!userAgreed) {
            logService.warn('Renderer', 'checkStatus() retornou falso. Abortando carregamento');
            abortLoading = true;
            showToast('Status do sistema não ideal. Saindo...', 'warning');
            LoadingUtils.hide(loadingId);
            window.location.href = '../index.html';
        } else {
            logService.success('Renderer', 'Status do sistema OK');
        }
    });

    try {
        // ETAPA 1: Verificar Status do Sistema (já está marcada como completed quando o status é OK)
        if (abortLoading) return;

        // ETAPA 2: Autenticação
        debugLog("[Renderer] Verificando autenticação do usuário via Firebase...");
        const auth = getAuth();
        await new Promise((resolve, reject) => {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    debugLog("[AuthState] Usuário autenticado:", {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                    });
                    sessionStorage.setItem("uuid", user.uid || '');
                    sessionStorage.setItem("email", user.email || '');
                    sessionStorage.setItem("tenant", user.tenant || 'defaultTenant');
                    resolve();
                } else {
                    reject(new Error("Usuário não autenticado. Redirecionando para login."));
                }
            });
        });
        debugLog("[Renderer] -> Autenticação OK (Firebase).");
        // Marcar etapas como concluídas
        LoadingUtils.step(loadingId, 'Verificar Status do Sistema', 'completed');
        LoadingUtils.step(loadingId, 'Autenticação', 'completed');
        if (abortLoading) return;

        // Recarrega variáveis do sessionStorage após autenticação
        tenant = sessionStorage.getItem("tenant");
        uuid = sessionStorage.getItem("uuid");
        email = sessionStorage.getItem("email");

        if (!tenant || !uuid || !email) {
            debugLog("[Renderer] Dados do usuário incompletos no sessionStorage:", { tenant, uuid, email });
            showAlert('Dados do usuário incompletos. Por favor, faça login novamente.', 'error');
            throw new Error("Dados do usuário incompletos.");
        }

        // Atualiza CONFIG
        CONFIG = {
            userId: uuid,
            companyName: tenant,
            userName: email,
            flowise: {
                chatflowId: '',
                apiHost: '',
                token: ''
            },
            apiCredentials: {}
        };
        debugLog("[Renderer] CONFIG atualizado após autenticação:", CONFIG);

        // ETAPA 3: Carregar Endpoints (via n8n) com cache e retry (SWR)
        if (abortLoading) return;
        debugLog("[Renderer] Carregando endpoints via", ENDPOINT_URL);
        const jwt = await getJwt();
        let data;

        // Cache simples com TTL para endpoints (SWR)
        const CACHE_KEY = 'lexi_endpoints_cache_v1';
        const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
        try {
            const cachedRaw = localStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
                const cached = JSON.parse(cachedRaw);
                const isFresh = Date.now() - (cached.timestamp || 0) < CACHE_TTL_MS;
                if (isFresh && cached.data && cached.data.endpoints) {
                    debugLog('[Renderer] Usando endpoints do cache (fresh)');
                    data = cached.data;
                }
            }
        } catch (e) {
            debugLog('[Renderer] Falha ao ler cache de endpoints:', e);
        }

        const fetchEndpoints = async () => {
            for (let attempt = 1; attempt <= ENDPOINT_MAX_RETRIES; attempt++) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), ENDPOINT_TIMEOUT_MS);
                try {
                    const response = await fetch(ENDPOINT_URL, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json'
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timer);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    // Trata respostas 200 sem corpo (evita Unexpected end of JSON input)
                    const text = await response.text();
                    const json = text && text.trim().length > 0 ? JSON.parse(text) : null;
                    if (json && json.endpoints) {
                        debugLog(`[Renderer] Endpoints carregados na tentativa ${attempt}.`);
                        try {
                            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: json }));
                        } catch (e) {
                            debugLog('[Renderer] Falha ao salvar endpoints no cache:', e);
                        }
                        return json;
                    }
                } catch (err) {
                    clearTimeout(timer);
                    debugLog(`[Renderer] Tentativa ${attempt} falhou:`, err);
                    // Exponential backoff entre tentativas
                    await new Promise(res => setTimeout(res, ENDPOINT_TIMEOUT_MS));
                }
            }
            // Fallback: configuração mínima para a UI inicializar
            debugLog('[Renderer] Aplicando fallback de endpoints vazios');
            return { endpoints: { flowise: {}, apiCredentials: {} } };
        };

        if (!data) {
            // Sem cache fresh: busca bloqueante
            data = await fetchEndpoints();
        } else {
            // Com cache fresh: revalida em background (não bloqueia)
            (async () => {
                try {
                    await fetchEndpoints();
                    debugLog('[Renderer] Revalidação de endpoints concluída');
                } catch (e) {
                    debugLog('[Renderer] Revalidação de endpoints falhou:', e);
                }
            })();
        }
        const endpoints = data?.endpoints || {};
        if (!endpoints.flowise) endpoints.flowise = {};
        if (!endpoints.apiCredentials) endpoints.apiCredentials = {};
        CONFIG.flowise = { ...endpoints.flowise };
        CONFIG.apiCredentials = { ...endpoints.apiCredentials };
        debugLog("[Renderer] CONFIG atualizado com endpoints:", CONFIG);
        debugLog("[Renderer] apiCredentials disponíveis:", Object.keys(CONFIG.apiCredentials));

        // ETAPA 4: Pré-carregar GPTs e Inicializar Serviços
        debugLog("[Renderer] Inicializando serviços e pré-carregando GPTs...");
        const apiService = new ApiService(CONFIG);
        const stateManager = new StateManager();
        const chatManager = new ChatManager(apiService, stateManager, CONFIG);
        debugLog('ChatManager instanciado no renderer');
        const uiManager = new UIManager(apiService, stateManager, chatManager, CONFIG, auth);
        const gptManager = new GPTManager(apiService, stateManager, uiManager, CONFIG);

        // Ajusta referências cruzadas
        chatManager.uiManager = uiManager;

        // Inicializa tooltips de Bootstrap, se presentes
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        debugLog("[Renderer] Serviços e gerenciadores inicializados.");

        // Paraleliza: pré-carregar GPTs e carregar lista de chats
        debugLog("[Renderer] Chamando gptManager.preloadGPTs() e chatManager.loadChatList() em paralelo...");
        const preloadGptsPromise = (async () => {
            await gptManager.preloadGPTs();
            debugLog('[Renderer] -> Pré-carregamento de GPTs finalizado.');
            LoadingUtils.step(loadingId, 'Pré-carregar GPTs', 'completed');
        })();
        const loadChatsPromise = (async () => {
            try {
                await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
                debugLog('[Renderer] -> Lista de chats carregada (paralelo).');
            } catch (err) {
                debugLog('[Renderer] Falha ao carregar chats (paralelo):', err);
            }
        })();
        LoadingUtils.step(loadingId, 'Carregar Endpoints', 'completed');
        await preloadGptsPromise; // garantir GPTs antes de selecionar padrão
        if (abortLoading) return;

        // ETAPA 5: Selecionar GPT Padrão (adiado para ação do usuário)
        debugLog("[Renderer] Seleção de GPT adiada para ação do usuário.");
        LoadingUtils.step(loadingId, 'Selecionar GPT Padrão', 'completed');
        if (abortLoading) return;

        // ETAPA 6: Inicializar Chatbot (adiado para quando usuário selecionar GPT/Chat)
        debugLog("[Renderer] Inicialização do chatbot adiada até seleção de GPT/Chat.");
        LoadingUtils.step(loadingId, 'Inicializar Chatbot', 'completed');
        if (abortLoading) return;

        // ETAPA 7: Carregar Lista de Chats (aguarda promessa paralela)
        debugLog("[Renderer] Aguardando conclusão da carga da lista de chats...");
        try { await loadChatsPromise; } catch {}
        stateManager.loadSelectedChat();
        debugLog("[Renderer] -> Lista de chats carregada e chat selecionado (se houver).");
        LoadingUtils.step(loadingId, 'Carregar Lista de Chats', 'completed');
        if (abortLoading) return;

        // ETAPA 8: Inicializar Serviço de Presença (adiado para background)
        debugLog("[Renderer] Inicialização do serviço de presença adiada para background.");

        // Finaliza com sucesso
        debugLog("[Renderer] Todas as etapas concluídas. Ocultando loading screen...");
        LoadingUtils.hide(loadingId);
        showAlert('LexiDecis: Estou pronto.', 'success');
        debugLog("[Renderer] Aplicação está pronta para uso.");

        // Configura limpeza ao fechar a página
        window.addEventListener('beforeunload', () => {
            presenceService.destroy();
        });

    } catch (error) {
        debugLog("[Renderer] Erro ao inicializar a aplicação:", error);
        showAlert('Erro ao carregar o sistema. Consulte o console para mais detalhes.', 'error');

        if (error.message.includes("não autenticado") || error.message.includes("Usuário não autenticado")) {
            window.location.href = "../index.html";
        } else {
            LoadingUtils.hide(loadingId);
        }
    }
});

// Função para configurar a UI de presença
function setupPresenceUI() {
    try {
        // Atualiza o contador de usuários ativos no user menu
        presenceService.onActiveUsersChange((count) => {
            updateActiveUsersCount(count);
        });
        
        debugLog("[Renderer] UI de presença configurada");
    } catch (error) {
        debugLog("[Renderer] Erro ao configurar UI de presença:", error);
    }
}

// Função para atualizar o contador de usuários ativos no user menu
function updateActiveUsersCount(count) {
    try {
        // Procura por qualquer elemento que contenha "Usuários Ativos"
        const menuItems = document.querySelectorAll('.lexi-user-menu-item');
        let updated = false;
        
        menuItems.forEach(item => {
            const text = item.textContent;
            if (text.includes('Usuários Ativos')) {
                const span = item.querySelector('span');
                if (span) {
                    span.textContent = `Usuários Ativos: ${count}`;
                    updated = true;
                }
            }
        });
        
        if (!updated) {
            debugLog("[Renderer] Elemento de usuários ativos não encontrado no menu");
        } else {
            debugLog("[Renderer] Contador de usuários ativos atualizado:", count);
        }
    } catch (error) {
        debugLog("[Renderer] Erro ao atualizar contador de usuários ativos:", error);
    }
}