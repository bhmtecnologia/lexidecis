// renderer.js

import LoadingScreen from './loadingScreen.js';
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
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Endpoint configuration
const ENDPOINT_URL = 'https://webhook.power.tec.br/webhook/lexidecis/endpoints';
const ENDPOINT_TIMEOUT_MS = 3000;
const ENDPOINT_MAX_RETRIES = 3;

// Checa se está em localhost/127.0.0.1 para modo debug
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const DEBUG_MODE = isLocalhost;

function debugLog(...args) {
    if (DEBUG_MODE) console.log(...args);
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
    debugLog("[Renderer] DOMContentLoaded disparado. Iniciando aplicação...");

    // 1) Cria o loading screen
    const loadingScreen = new LoadingScreen();
    debugLog("[Renderer] LoadingScreen criado.");

    // 2) Instancia StatusCheck para verificar o status do sistema
    const statusCheck = new StatusCheck();
    debugLog("[Renderer] StatusCheck instanciado.");

    // 3) Definimos as etapas (exibidas no loading) com a lista de chats sendo a última etapa
    const etapasDeCarregamento = [
        'Verificar Status do Sistema',
        'Autenticação',
        'Carregar Endpoints',
        'Pré-carregar GPTs',
        'Selecionar GPT Padrão',
        'Inicializar Chatbot',
        'Carregar Lista de Chats'
    ];

    // 4) Exibir a tela de loading
    loadingScreen.show(etapasDeCarregamento);
    debugLog("[Renderer] LoadingScreen exibido com etapas:", etapasDeCarregamento);

    // Inicia a verificação do status de forma assíncrona
    statusCheck.checkStatus().then(userAgreed => {
        if (!userAgreed) {
            debugLog("[Renderer] checkStatus() retornou falso. Abortando carregamento...");
            abortLoading = true;
            showToast('Status do sistema não ideal. Saindo...', 'warning');
            loadingScreen.hide();
            window.location.href = '../index.html';
        } else {
            debugLog("[Renderer] Status do sistema OK.");
        }
    });

    try {
        // ETAPA 1: Verificar Status do Sistema (marca etapa concluída sem aguardar a verificação)
        await loadingScreen.loadModel('Verificar Status do Sistema');
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
        await loadingScreen.loadModel('Autenticação');
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

        // ETAPA 3: Carregar Endpoints (via n8n) com timeout e retry
        await loadingScreen.loadModel('Carregar Endpoints');
        if (abortLoading) return;
        debugLog("[Renderer] Carregando endpoints via", ENDPOINT_URL);
        const jwt = await getJwt();
        let data;
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
                const json = await response.json();
                data = json;
                debugLog(`[Renderer] Endpoints carregados na tentativa ${attempt}.`);
                break;
            } catch (err) {
                clearTimeout(timer);
                debugLog(`[Renderer] Tentativa ${attempt} falhou:`, err);
                if (attempt === ENDPOINT_MAX_RETRIES) {
                    // Fallback UX: informar e oferecer recarregar
                    showAlert('Não foi possível carregar configurações. Verifique sua conexão e clique em Recarregar Configurações.', 'error');
                    loadingScreen.hide();
                    return;
                }
                // Exponential backoff entre tentativas
                await new Promise(res => setTimeout(res, ENDPOINT_TIMEOUT_MS));
            }
        }
        const endpoints = data?.endpoints;
        if (!endpoints || !endpoints.flowise || !endpoints.apiCredentials) {
            throw new Error("Dados de endpoints inválidos ou não encontrados.");
        }
        CONFIG.flowise = { ...endpoints.flowise };
        CONFIG.apiCredentials = { ...endpoints.apiCredentials };
        debugLog("[Renderer] CONFIG atualizado com endpoints:", CONFIG);

        // ETAPA 4: Pré-carregar GPTs e Inicializar Serviços
        debugLog("[Renderer] Inicializando serviços e pré-carregando GPTs...");
        const apiService = new ApiService(CONFIG);
        const stateManager = new StateManager();
        const chatManager = new ChatManager(apiService, stateManager, CONFIG);
        const uiManager = new UIManager(apiService, stateManager, chatManager, CONFIG, auth);
        const gptManager = new GPTManager(apiService, stateManager, uiManager, CONFIG);

        // Ajusta referências cruzadas
        chatManager.uiManager = uiManager;

        // Inicializa tooltips de Bootstrap, se presentes
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        debugLog("[Renderer] Serviços e gerenciadores inicializados.");

        debugLog("[Renderer] Chamando gptManager.preloadGPTs()...");
        await gptManager.preloadGPTs();
        debugLog("[Renderer] -> Pré-carregamento de GPTs finalizado.");
        await loadingScreen.loadModel('Pré-carregar GPTs');
        if (abortLoading) return;

        // ETAPA 5: Selecionar GPT Padrão (caso nenhum chat esteja selecionado)
        if (!stateManager.selectedChat) {
            debugLog("[Renderer] Nenhum chat selecionado; procurando GPT padrão...");
            const defaultGPTId = "6d71f8f4-b91d-45ed-80a9-803ae61a7c98"; // Exemplo
            const defaultGPT = gptManager.getGPTById(defaultGPTId);
            if (defaultGPT) {
                debugLog("[Renderer] GPT padrão encontrado:", defaultGPT);
                await gptManager.selectGPTItem(defaultGPT);
                stateManager.setSelectedGPT(defaultGPT);
                debugLog(`[Renderer] GPT padrão selecionado: ${defaultGPT.name}`);
                await uiManager.createNewChat();
            } else {
                showAlert('GPT padrão não encontrado. Consulte o suporte.', 'error');
                throw new Error('GPT padrão não encontrado.');
            }
        } else {
            debugLog("[Renderer] Já existe um chat selecionado. Pulando GPT padrão...");
        }
        await loadingScreen.loadModel('Selecionar GPT Padrão');
        if (abortLoading) return;

        // ETAPA 6: Inicializar Chatbot (UI e listeners)
        debugLog("[Renderer] Inicializando chatbot via uiManager.initializeChatbot()...");
        await uiManager.initializeChatbot();
        debugLog("[Renderer] -> Chatbot inicializado.");
        await loadingScreen.loadModel('Inicializar Chatbot');
        if (abortLoading) return;

        // ETAPA 7: Carregar Lista de Chats (realizada ao final)
        debugLog("[Renderer] Carregando lista de chats via chatManager.loadChatList()...");
        await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
        stateManager.loadSelectedChat();
        debugLog("[Renderer] -> Lista de chats carregada e chat selecionado (se houver).");
        await loadingScreen.loadModel('Carregar Lista de Chats');
        if (abortLoading) return;

        // Finaliza com sucesso
        debugLog("[Renderer] Todas as etapas concluídas. Ocultando loading screen...");
        loadingScreen.hide();
        showAlert('LexiDecis: Estou pronto.', 'success');
        debugLog("[Renderer] Aplicação está pronta para uso.");

    } catch (error) {
        debugLog("[Renderer] Erro ao inicializar a aplicação:", error);
        showAlert('Erro ao carregar o sistema. Consulte o console para mais detalhes.', 'error');

        if (error.message.includes("não autenticado") || error.message.includes("Usuário não autenticado")) {
            window.location.href = "../index.html";
        } else {
            loadingScreen.hide();
        }
    }
});