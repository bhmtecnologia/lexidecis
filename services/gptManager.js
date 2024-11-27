/**
 * @class GPTManager
 * @classdesc Gerencia a interação com os GPTs, incluindo carregamento, seleção e configuração.
 */
import { showToast } from './notificationManager.js';
export default class GPTManager {
    /**
     * @constructor
     * @param {ApiService} apiService - Instância do ApiService para realizar requisições à API.
     * @param {StateManager} stateManager - Instância do StateManager para gerenciar o estado da aplicação.
     * @param {UIManager} uiManager - Instância do UIManager para interação com a interface do usuário.
     * @param {Object} config - Objeto de configuração vindo do renderer.js.
     */
    constructor(apiService, stateManager, uiManager, config) {
        /**
         * @type {ApiService}
         * @description Serviço para realizar requisições à API.
         */
        this.apiService = apiService;

        /**
         * @type {StateManager}
         * @description Gerencia o estado da aplicação.
         */
        this.stateManager = stateManager;

        /**
         * @type {UIManager}
         * @description Gerencia a interação com a interface do usuário.
         */
        this.uiManager = uiManager;

        /**
         * @type {Object}
         * @description Objeto de configuração da aplicação.
         */
        this.config = config;

        /**
         * @type {bootstrap.Modal|undefined}
         * @description Instância do modal Bootstrap para seleção de GPTs.
         */
        const gptModalElement = document.getElementById('gpt-modal');
        if (gptModalElement) {
            this.modal = new bootstrap.Modal(gptModalElement);
        }

        /**
         * @type {boolean}
         * @description Indica se eventos estão bloqueados para evitar seleções simultâneas.
         */
        this.isEventLocked = false;
    }

    /**
     * Abre o modal para seleção de um GPT.
     * @async
     * @returns {Promise<void>}
     */
    async openModal() {

        showToast('Carregando lista de GPTs...', 'info');
        if (this.stateManager.isLoadingGPTsActive()) {
            console.log('A lista de GPTs já está sendo carregada.');
            return;
        }

        try {
            await this.loadGPTList();
            if (this.modal) {
                this.modal.show();
            } else {
                console.error('Modal não está inicializado.');
            }
        } catch (error) {
            console.error('Erro ao abrir o modal de GPT:', error);
        }
    }

    /**
     * Carrega a lista de GPTs disponíveis a partir da API.
     * @async
     * @returns {Promise<void>}
     */
    async loadGPTList() {
        if (this.stateManager.isLoadingGPTsActive()) {
            console.log('A lista de GPTs já está sendo carregada.');
            return;
        }

        this.stateManager.setLoadingGPTs(true);

        const params = {
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId
        };

        try {
            const gptData = await this.apiService.request('readGPT', params, 'GET');
            console.log('Lista de GPTs:', gptData);
            this.populateGPTMenu(gptData);
        } catch (error) {
            console.error('Erro ao carregar lista de GPTs:', error);
            this.uiManager.showError('Erro ao carregar a lista de GPTs. Verifique o console para mais detalhes.');
        } finally {
            this.stateManager.setLoadingGPTs(false);
        }
    }

    /**
     * Popula o menu de seleção de GPTs na interface.
     * @param {Array<Object>} gpts - Lista de GPTs recebida da API.
     */
    populateGPTMenu(gpts) {
        const gptList = document.getElementById('gpt-list');
        if (!gptList) {
            console.error('Elemento gpt-list não encontrado.');
            return;
        }

        gptList.innerHTML = '';

        if (!gpts || gpts.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Nenhum GPT encontrado.';
            emptyMessage.classList.add('list-group-item', 'text-center');
            gptList.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();

        gpts.forEach(gpt => {
            if (!gpt.enabled) return;

            const gptItem = document.createElement('li');
            gptItem.classList.add('list-group-item', 'gpt-list-item', 'd-flex', 'flex-column', 'cursor-pointer');
            gptItem.innerHTML = `
                <div class="gpt-name fw-bold">${gpt.name}</div>
                <div class="gpt-description text-muted">${gpt.description || 'Sem descrição'}</div>
            `;
            gptItem.dataset.gptId = gpt.id;

            gptItem.addEventListener('click', async (event) => {
                await this.handleGPTSelection(event, gpt, gptItem);
            });
            fragment.appendChild(gptItem);
        });

        gptList.appendChild(fragment);
    }

    /**
     * Gerencia a seleção de um GPT com bloqueio completo para evitar múltiplas seleções simultâneas.
     * @param {Event} event - Evento de clique.
     * @param {Object} gpt - Objeto GPT selecionado.
     * @param {HTMLElement} gptItem - Elemento DOM do GPT selecionado.
     * @async
     * @returns {Promise<void>}
     */
    async handleGPTSelection(event, gpt, gptItem) {
        event.preventDefault();
    
        // Exibe o toast informando que a seleção está em andamento
        showToast('Seu GPT foi definido', 'warning');
    
        if (this.isEventLocked || this.stateManager.isGPTSelectionLoadingActive()) {
            console.log('A seleção de GPT está bloqueada.');
            return;
        }
    
        console.log('Bloqueio ativado: iniciando seleção de GPT.');
        this.isEventLocked = true;
        this.stateManager.setGPTSelectionLoading(true);
    
        try {
            gptItem.classList.add('loading'); // Classe para feedback visual
            await this.selectGPTItem(gpt);
        } catch (error) {
            console.error('Erro ao selecionar GPT:', error);
            showToast('Erro ao selecionar GPT. Por favor, tente novamente.', 'danger');
        } finally {
            this.isEventLocked = false;
            this.stateManager.setGPTSelectionLoading(false);
            gptItem.classList.remove('loading');
        }
    }
    /**
     * Seleciona um GPT e realiza as operações necessárias, como configurar a sessão e inicializar o chatbot.
     * @param {Object} gpt - Objeto GPT selecionado.
     * @async
     * @returns {Promise<void>}
     */
    async selectGPTItem(gpt) {
        this.stateManager.setSelectedGPT(gpt);
        console.log('GPT selecionado:', gpt);

        if (this.stateManager.selectedGPTId) {
            await this.fetchGPTConfig(this.stateManager.selectedGPTId);

            if (!this.stateManager.currentSessionId) {
                this.stateManager.setSessionId(this.generateSessionId());
                const defaultChatName = this.stateManager.selectedGPT.name;
                const defaultChat = {
                    id: this.stateManager.currentSessionId,
                    name: defaultChatName,
                    date: new Date().toISOString()
                };
                this.stateManager.addChat(defaultChat);
                this.uiManager.populateChatMenu(this.stateManager.chats);
            }

            await this.uiManager.initializeChatbot();
        } else {
            console.error('GPT selecionado não possui um id válido.');
        }

        // Armazena informações no localStorage
        localStorage.setItem('selectedGPT', JSON.stringify(this.stateManager.selectedGPT));
        localStorage.setItem('selectedGPTId', this.stateManager.selectedGPTId);
        localStorage.setItem('gptConfig', JSON.stringify(this.stateManager.gptConfig));

        // Fecha o modal após a seleção
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * Busca as configurações detalhadas do GPT selecionado a partir da API.
     * @param {string} gptId - ID do GPT selecionado.
     * @async
     * @returns {Promise<void>}
     */
    async fetchGPTConfig(gptId) {
        const params = {
            gpt_id: gptId,
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId
        };

        try {
            const configData = await this.apiService.request('overrideConfig', params, 'GET');
            console.log('Configurações do GPT:', configData);

            const aggregatedConfig = configData.reduce((acc, current) => {
                return { ...acc, ...current.value };
            }, {});

            this.stateManager.setGPTConfig(aggregatedConfig);

            console.log('Configurações agregadas do GPT:', this.stateManager.gptConfig);
        } catch (error) {
            console.error('Erro ao buscar configurações do GPT:', error);
            this.uiManager.showError('Erro ao buscar configurações do GPT. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Gera um novo ID de sessão único.
     * @returns {string} - Novo ID de sessão.
     */
    generateSessionId() {
        //const timestamp = BigInt(Date.now()) * 1000n;
        //const randomComponent = BigInt(Math.floor(Math.random() * 1000));
        //const sessionId = timestamp + randomComponent;
        const sessionId = crypto.randomUUID();
        return sessionId.toString();
    }
}