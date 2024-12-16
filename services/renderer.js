import { showRenamePrompt, showAlert, showDeleteConfirmation } from './alertManager.js';
import { showToast } from './notificationManager.js';
import Chatbot from "./web.js";
import ApiService from './apiService.js';
import StateManager from './stateManager.js';
import HistoryManager from './historyManager.js';
import GPTManager from './gptManager.js';
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
                    console.log("[AuthState] Usuário autenticado:", {
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
        const response = await fetch('https://n8n.prod.bhm.tec.br/webhook/5ef965e9-3af4-40c6-b730-2efbd21da0cf', {
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
        const endpoints = data?.endpoints; // Acessa diretamente "endpoints"
        if (!endpoints || !endpoints.flowise || !endpoints.apiCredentials) {
            throw new Error("Dados de endpoints inválidos ou não encontrados.");
        }

        // Atualiza as configurações com os dados recebidos
        CONFIG.flowise = { ...endpoints.flowise };
        CONFIG.apiCredentials = { ...endpoints.apiCredentials };

        console.log("[Endpoints] Configurações atualizadas com sucesso:", CONFIG);

        // Verifica o status do sistema
        const userAgreed = await statusCheck.checkStatus();

        if (!userAgreed) {
            console.warn('Usuário escolheu sair. Encerrando aplicação...');
            loadingScreen.hide();
            window.location.href = '../index.html';
            return;
        }

        console.log('Sistema ok ou status aprovado pelo usuário. Continuando inicialização...');

        // Inicializa os serviços e gerenciadores
        const apiService = new ApiService(CONFIG);
        const stateManager = new StateManager();
        const chatManager = new ChatManager(apiService, stateManager, CONFIG);
        const uiManager = new UIManager(apiService, stateManager, chatManager, CONFIG);

        // Associa o uiManager ao chatManager
        chatManager.uiManager = uiManager;

        // Configura tooltips do Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Carrega GPT e inicializa a interface
        const defaultGPTId = "e1e3cc7b-0ddb-4f7b-981e-0d9d1e20f69b"; // carrega o gpt padrao a partir do id dele. trazendo todas as configuracoes
        await stateManager.loadSelectedGPT(defaultGPTId, apiService);
        await chatManager.loadChatList(chatManager.populateChatMenu.bind(chatManager));
        stateManager.loadSelectedChat();
        await uiManager.initializeChatbot();

        if (!stateManager.selectedGPTId) {
            await chatManager.selectDefaultGPT(defaultGPTId);
        }

        console.log('Inicialização concluída. Sistema pronto para uso.');
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


