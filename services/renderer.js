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

document.addEventListener('DOMContentLoaded', async () => {
    debugLog("[Renderer] DOMContentLoaded disparado. Iniciando aplicação...");

    // 1) Cria o loading screen
    const loadingScreen = new LoadingScreen();
    debugLog("[Renderer] LoadingScreen criado.");

    // 2) Checagem de status (caso precise)
    const statusCheck = new StatusCheck();
    debugLog("[Renderer] StatusCheck instanciado.");

    // 3) Definimos as etapas (exibidas no loading)
    const etapasDeCarregamento = [
        'Autenticação',
        'Carregar Endpoints',
        'Verificar Status do Sistema',
        'Pré-carregar GPTs',
        'Carregar Lista de Chats',
        'Selecionar GPT Padrão',
        'Inicializar Chatbot'
    ];

    // 4) Exibir a tela de loading
    loadingScreen.show(etapasDeCarregamento);
    debugLog("[Renderer] LoadingScreen exibido com etapas:", etapasDeCarregamento);

    try {
        // ---------------------------------------------------------------
        // ETAPA 1: AUTENTICAÇÃO
        // ---------------------------------------------------------------
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

        // Recarregamos as variáveis do sessionStorage agora que temos certeza de que o user está auth
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

        // ---------------------------------------------------------------
        // ETAPA 2: CARREGAR ENDPOINTS (via n8n)
        // ---------------------------------------------------------------
        debugLog("[Renderer] Buscando endpoints via n8n.power.tec.br/webhook/lexidecis/endpoints...");
        const jwt = await getJwt();
        const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/endpoints', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Erro ao buscar endpoints: ${response.statusText}`);
        }
        const data = await response.json();
        const endpoints = data?.endpoints;
        if (!endpoints || !endpoints.flowise || !endpoints.apiCredentials) {
            throw new Error("Dados de endpoints inválidos ou não encontrados.");
        }
        // Atualiza CONFIG com os endpoints obtidos
        CONFIG.flowise = { ...endpoints.flowise };
        CONFIG.apiCredentials = { ...endpoints.apiCredentials };
        debugLog("[Renderer] Endpoints carregados e CONFIG atualizado:", CONFIG);

        await loadingScreen.loadModel('Carregar Endpoints');

        // ---------------------------------------------------------------
        // ETAPA 3: VERIFICAR STATUS DO SISTEMA (StatusCheck)
        // ---------------------------------------------------------------
        debugLog("[Renderer] Verificando status do sistema...");
        const userAgreed = await statusCheck.checkStatus();
        if (!userAgreed) {
            debugLog("[Renderer] checkStatus() retornou falso. Encerrando aplicação por escolha do usuário...");
            loadingScreen.hide();
            window.location.href = '../index.html';
            return; 
        }
        debugLog("[Renderer] Sistema OK ou usuário confirmou. Prosseguindo...");
        await loadingScreen.loadModel('Verificar Status do Sistema');

        // ---------------------------------------------------------------
        // ETAPA 4: INICIALIZAR SERVIÇOS E GERENCIADORES
        // ---------------------------------------------------------------
        debugLog("[Renderer] Inicializando serviços (ApiService, StateManager, etc.)...");
        const apiService = new ApiService(CONFIG);
        const stateManager = new StateManager();
        const chatManager = new ChatManager(apiService, stateManager, CONFIG);
        const uiManager = new UIManager(apiService, stateManager, chatManager, CONFIG, auth);
        const gptManager = new GPTManager(apiService, stateManager, uiManager, CONFIG);

        // Ajusta referências cruzadas
        chatManager.uiManager = uiManager;

        // (Opcional) inicializar tooltips de Bootstrap, se existir no HTML
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        debugLog("[Renderer] Serviços e gerenciadores inicializados.");

        // ---------------------------------------------------------------
        // ETAPA 5: PRÉ-CARREGAR GPTs
        // ---------------------------------------------------------------
        debugLog("[Renderer] Chamando gptManager.preloadGPTs()...");
        await gptManager.preloadGPTs();
        debugLog("[Renderer] -> Pré-carregamento de GPTs finalizado.");
        await loadingScreen.loadModel('Pré-carregar GPTs');

        // ---------------------------------------------------------------
        // ETAPA 6: CARREGAR LISTA DE CHATS
        // ---------------------------------------------------------------
        debugLog("[Renderer] Carregando lista de chats via chatManager.loadChatList()...");
        await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
        stateManager.loadSelectedChat();
        debugLog("[Renderer] -> Lista de chats carregada e chat selecionado (se houver).");
        await loadingScreen.loadModel('Carregar Lista de Chats');

        // ---------------------------------------------------------------
        // ETAPA 7: SELECIONAR GPT PADRÃO (se não houver chat selecionado)
        // ---------------------------------------------------------------
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

        // ---------------------------------------------------------------
        // ETAPA 8: INICIALIZAR CHATBOT (UI e listeners)
        // ---------------------------------------------------------------
        debugLog("[Renderer] Inicializando chatbot via uiManager.initializeChatbot()...");
        await uiManager.initializeChatbot();
        debugLog("[Renderer] -> Chatbot inicializado.");
        await loadingScreen.loadModel('Inicializar Chatbot');

        // Finalizamos com sucesso
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