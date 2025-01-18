// renderer.js

// Verifica se está rodando em localhost ou 127.0.0.1
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// ... imports
import GPTManager from './gptManager.js';
import { showAlert } from './alertManager.js';
import { showToast } from './notificationManager.js';
import Chatbot from "./web.js";
import ApiService from './apiService.js';
import StateManager from './stateManager.js';
import HistoryManager from './historyManager.js';
import ChatManager from './chatManager.js';
import UIManager from './uiManager.js';
import StatusCheck from './statusCheck.js';
import LoadingScreen from './loadingScreen.js';
import { getJwt } from './auth.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// Inicializa o Firebase Auth
const auth = getAuth();

// Recuperar as variáveis do sessionStorage
const tenant = sessionStorage.getItem("tenant");
const uuid = sessionStorage.getItem("uuid");
const email = sessionStorage.getItem("email");

// Definição inicial das configurações da aplicação
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
    const loadingScreen = new LoadingScreen();
    const statusCheck = new StatusCheck();

    // Defina as etapas que deseja monitorar
    const etapasDeCarregamento = [
        'Autenticação',
        'Carregar Endpoints',
        'Verificar Status do Sistema',
        'Pré-carregar GPTs',
        'Carregar Lista de Chats',
        'Selecionar GPT Padrão',
        'Inicializar Chatbot'
    ];

    // Exibe a tela de loading com as etapas definidas
    loadingScreen.show(etapasDeCarregamento);

    try {
        // Garante que o estado de autenticação do usuário seja verificado
        await new Promise((resolve, reject) => {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    debugLog("[AuthState] Usuário autenticado:", {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                    });

                    sessionStorage.setItem("uuid", user.uid);
                    sessionStorage.setItem("email", user.email);
                    sessionStorage.setItem("tenant", user.tenant || 'defaultTenant');
                    resolve();
                } else {
                    reject(new Error("Usuário não autenticado. Redirecionando para login."));
                }
            });
        });
        await loadingScreen.loadModel('Autenticação');

        // Recuperar variáveis do sessionStorage após autenticação
        const tenant = sessionStorage.getItem("tenant");
        const uuid = sessionStorage.getItem("uuid");
        const email = sessionStorage.getItem("email");

        if (!tenant || !uuid || !email) {
            console.warn('Dados do usuário incompletos no sessionStorage.');
            showAlert('Dados do usuário incompletos. Por favor, faça login novamente.', 'error');
            window.location.href = '../login.html';
            return;
        }

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

        // Carregar Endpoints
        const jwt = await getJwt();
        const response = await fetch('https://n8n.bhm.tec.br/webhook/readEndpoints', {
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

        CONFIG.flowise = { ...endpoints.flowise };
        CONFIG.apiCredentials = { ...endpoints.apiCredentials };
        debugLog("[Endpoints] Configurações atualizadas com sucesso:", CONFIG);

        await loadingScreen.loadModel('Carregar Endpoints');

        const userAgreed = await statusCheck.checkStatus();
        if (!userAgreed) {
            console.warn('Usuário escolheu sair. Encerrando aplicação...');
            loadingScreen.hide();
            window.location.href = '../index.html';
            return;
        }
        debugLog('Sistema ok ou status aprovado pelo usuário. Continuando inicialização...');

        await loadingScreen.loadModel('Verificar Status do Sistema');

        // Inicializa serviços e gerenciadores
        const apiService = new ApiService(CONFIG);
        const stateManager = new StateManager();
        const chatManager = new ChatManager(apiService, stateManager, CONFIG);
        const uiManager = new UIManager(apiService, stateManager, chatManager, CONFIG, auth);
        const gptManager = new GPTManager(apiService, stateManager, uiManager, CONFIG);

        chatManager.uiManager = uiManager;

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        await gptManager.preloadGPTs();
        await loadingScreen.loadModel('Pré-carregar GPTs');

        await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
        stateManager.loadSelectedChat();
        await loadingScreen.loadModel('Carregar Lista de Chats');

        if (!stateManager.selectedChat) {
            const defaultGPTId = "6d71f8f4-b91d-45ed-80a9-803ae61a7c98";
            const defaultGPT = gptManager.getGPTById(defaultGPTId);
            if (defaultGPT) {
                await gptManager.selectGPTItem(defaultGPT);
                stateManager.setSelectedGPT(defaultGPT);
                debugLog(`[Renderer] GPT padrão selecionado: ${defaultGPT.name}`);
                await uiManager.createNewChat();
            } else {
                showAlert('GPT padrão não encontrado. Consulte o suporte.', 'error');
                throw new Error('GPT padrão não encontrado.');
            }
        }
        await loadingScreen.loadModel('Selecionar GPT Padrão');

        await uiManager.initializeChatbot();
        await loadingScreen.loadModel('Inicializar Chatbot');

        debugLog('Inicialização concluída. Sistema pronto para uso.');
        showAlert('LexiDecis: Estou pronto.', 'success');

        // Oculta a tela de loading somente após todas as etapas estarem concluídas
        loadingScreen.hide();
    } catch (error) {
        console.error('Erro ao inicializar a aplicação:', error);
        showAlert('Erro ao carregar o sistema. Consulte o console para mais detalhes.', 'error');

        if (error.message.includes("não autenticado")) {
            window.location.href = "../index.html";
        }
    }
    // Removemos o bloco finally para controlar a ocultação da tela de loading manualmente.
});