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
import { showRenamePrompt, showAlert, showDeleteConfirmation } from './alertManager.js';
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
const CONFIG = {
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

/* ==========================
   5. Inicialização da Aplicação
========================== */

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = new LoadingScreen();
    const statusCheck = new StatusCheck();

    // Exibe a tela de loading
    loadingScreen.show();

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

                    // Atualiza o sessionStorage com dados do usuário, se necessário
                    sessionStorage.setItem("uuid", user.uid);
                    sessionStorage.setItem("email", user.email);
                    sessionStorage.setItem("tenant", user.tenant || 'defaultTenant'); // Ajuste conforme a estrutura do usuário

                    resolve();
                } else {
                    reject(new Error("Usuário não autenticado. Redirecionando para login."));
                }
            });
        });

        // Recuperar as variáveis do sessionStorage
        const tenant = sessionStorage.getItem("tenant");
        const uuid = sessionStorage.getItem("uuid");
        const email = sessionStorage.getItem("email");

        if (!tenant || !uuid || !email) {
            console.warn('Dados do usuário incompletos no sessionStorage.');
            showAlert('Dados do usuário incompletos. Por favor, faça login novamente.', 'error');
            window.location.href = '../login.html'; // Ou a página apropriada
            return;
        }

        // Definição inicial das configurações da aplicação
        const CONFIG = {
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

        // Faz a chamada à API para obter os endpoints
        const jwt = await getJwt(); // Obtém o JWT do usuário autenticado
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

        // Verifica e acessa corretamente os dados de endpoints
        const endpoints = data?.endpoints;
        if (!endpoints || !endpoints.flowise || !endpoints.apiCredentials) {
            throw new Error("Dados de endpoints inválidos ou não encontrados.");
        }

        // Atualiza as configurações com os dados recebidos
        CONFIG.flowise = { ...endpoints.flowise };
        CONFIG.apiCredentials = { ...endpoints.apiCredentials };

        debugLog("[Endpoints] Configurações atualizadas com sucesso:", CONFIG);

        // Verifica o status do sistema
        const userAgreed = await statusCheck.checkStatus();

        if (!userAgreed) {
            console.warn('Usuário escolheu sair. Encerrando aplicação...');
            loadingScreen.hide();
            window.location.href = '../index.html';
            return;
        }

        debugLog('Sistema ok ou status aprovado pelo usuário. Continuando inicialização...');

        // Inicializa os serviços e gerenciadores
        const apiService = new ApiService(CONFIG);
        const stateManager = new StateManager();
        const chatManager = new ChatManager(apiService, stateManager, CONFIG);
        const uiManager = new UIManager(apiService, stateManager, chatManager, CONFIG, auth);
        const gptManager = new GPTManager(apiService, stateManager, uiManager, CONFIG); // Instância do GPTManager

        // Associa o uiManager ao chatManager
        chatManager.uiManager = uiManager;

        // Configura tooltips do Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

// Carrega GPTs previamente
await gptManager.preloadGPTs();

// Carrega a lista de chats
await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
stateManager.loadSelectedChat();

// Verifique se há um chat selecionado
if (!stateManager.selectedChat) {
    // Se não houver, selecione o GPT padrão e crie um novo chat
    const defaultGPTId = "6d71f8f4-b91d-45ed-80a9-803ae61a7c98";
    const defaultGPT = gptManager.getGPTById(defaultGPTId); // Usa o método getGPTById

    if (defaultGPT) {
        // Define o GPT selecionado no stateManager
        stateManager.setSelectedGPT(defaultGPT);
        debugLog(`[Renderer] GPT padrão selecionado: ${defaultGPT.name}`);

        // Cria um novo chat com o GPT padrão
        await uiManager.createNewChat();
    } else {
        showAlert('GPT padrão não encontrado. Consulte o suporte.', 'error');
        throw new Error('GPT padrão não encontrado.');
    }
}

        // Inicializa o chatbot após garantir que selectedGPT está definido
        await uiManager.initializeChatbot();

        debugLog('Inicialização concluída. Sistema pronto para uso.');
        showAlert('LexiDecis: Estou pronto.', 'success');
    } catch (error) {
        console.error('Erro ao inicializar a aplicação:', error);
        showAlert('Erro ao carregar o sistema. Consulte o console para mais detalhes.', 'error');

        // Redireciona para a página de login se necessário
        if (error.message.includes("não autenticado")) {
            window.location.href = "../index.html";
        }
    } finally {
        // Oculta a tela de loading
        loadingScreen.hide();
    }
});