const DEBUG_MODE = true; // Altere para true se quiser habilitar os logs

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

                    resolve();
                } else {
                    reject(new Error("Usuário não autenticado. Redirecionando para login."));
                }
            });
        });

        // Obtém o JWT do usuário autenticado
        const jwt = await getJwt();

        // Faz a chamada à API para obter os endpoints
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

        // Carrega GPTs préviamente
        await gptManager.preloadGPTs();

        // Carrega a lista de chats
        await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
        stateManager.loadSelectedChat();
        await uiManager.initializeChatbot();
        const defaultGPTId = "6d71f8f4-b91d-45ed-80a9-803ae61a7c98";
        if (!stateManager.selectedGPTId) {
            await chatManager.selectDefaultGPT(defaultGPTId);
        }

        debugLog('Inicialização concluída. Sistema pronto para uso.');
        showAlert('LexiDecis: Estou pronto.', 'success');
    } catch (error) {
        console.error('Erro ao inicializar a aplicação:', error);
        showAlert('Erro ao carregar o sistema. Consulte o console para mais detalhes.', 'error');

        // Redireciona para a página de login se necessário
        if (error.message.includes("não autenticado") || error.message.includes("não autenticado")) {
            window.location.href = "../index.html";
        }
    } finally {
        // Oculta a tela de loading
        loadingScreen.hide();
    }
});