// gptManager.js

export default class GPTManager {
    /**
     * @param {ApiService} apiService - Instance of ApiService for making API requests.
     * @param {StateManager} stateManager - Instance of StateManager for managing application state.
     * @param {UIManager} uiManager - Instance of UIManager to interact with the UI.
     * @param {Object} config - Configuration object from renderer.js.
     */
    constructor(apiService, stateManager, uiManager, config) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.uiManager = uiManager;
        this.config = config;

        // Initialize the modal
        const gptModalElement = document.getElementById('gpt-modal');
        if (gptModalElement) {
            this.modal = new bootstrap.Modal(gptModalElement);
        }

        // Bind methods if necessary
    }

    /**
     * Abre o modal para seleção de um GPT.
     */
    async openModal() {
        await this.loadGPTList();
        if (this.modal) {
            this.modal.show();
        } else {
            console.error('Modal não está inicializado.');
        }
    }

    /**
     * Carrega a lista de GPTs disponíveis a partir da API.
     */
    async loadGPTList() {
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
        }
    }

    /**
     * Popula o menu de seleção de GPTs na interface.
     * @param {Array} gpts - Lista de GPTs recebida da API.
     */
    populateGPTMenu(gpts) {
        const gptList = document.getElementById('gpt-list');
        if (!gptList) {
            console.error('Elemento gpt-list não encontrado.');
            return;
        }
        gptList.innerHTML = ''; // Limpar lista existente

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
            gptItem.addEventListener('click', () => this.selectGPTItem(gpt));
            fragment.appendChild(gptItem);
        });

        gptList.appendChild(fragment);
    }

    /**
     * Lida com a seleção de um GPT pelo usuário.
     * @param {Object} gpt - Objeto GPT selecionado.
     */
    async selectGPTItem(gpt) {
        this.stateManager.setSelectedGPT(gpt);
        console.log('GPT selecionado:', gpt);

        // Atualizar a configuração do chatbot com o GPT selecionado
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

        // Persistir a seleção do GPT
        localStorage.setItem('selectedGPT', JSON.stringify(this.stateManager.selectedGPT));
        localStorage.setItem('selectedGPTId', this.stateManager.selectedGPTId);
        localStorage.setItem('gptConfig', JSON.stringify(this.stateManager.gptConfig));

        // Fechar o modal
        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * Busca as configurações detalhadas do GPT selecionado.
     * @param {string} gptId - ID do GPT selecionado.
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

            // Agregar todos os objetos 'value' em um único objeto gptConfig
            const aggregatedConfig = configData.reduce((acc, current) => {
                return { ...acc, ...current.value };
            }, {});

            // Atualizar o stateManager com o gptConfig agregado
            this.stateManager.setGPTConfig(aggregatedConfig);

            console.log('Configurações agregadas do GPT:', this.stateManager.gptConfig);
        } catch (error) {
            console.error('Erro ao buscar configurações do GPT:', error);
            this.uiManager.showError('Erro ao buscar configurações do GPT. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Seleciona o GPT padrão caso nenhum esteja selecionado.
     * @param {string} gptId - ID do GPT padrão.
     */
    async selectDefaultGPT(gptId) {
        // Implementar a lógica para selecionar um GPT padrão
        console.log(`Selecione o GPT padrão com ID: ${gptId}`);
        await this.loadGPTList();
        const gptList = document.getElementById('gpt-list');
        if (gptList) {
            const defaultGPTItem = gptList.querySelector(`.gpt-list-item[data-gpt-id="${gptId}"]`);
            if (defaultGPTItem) {
                defaultGPTItem.click();
            } else {
                console.warn('GPT padrão não encontrado na lista.');
            }
        }
    }

    /**
     * Gera um novo ID de sessão.
     * @returns {string} - Novo ID de sessão.
     */
    generateSessionId() {
        const timestamp = BigInt(Date.now()) * 1000n;  // Obtém o timestamp atual em milissegundos
        const randomComponent = BigInt(Math.floor(Math.random() * 1000));  // Gera um número aleatório entre 0 e 999
        const sessionId = timestamp + randomComponent;  // Soma o timestamp com o número aleatório para gerar um ID único
        return sessionId.toString();  // Converte o BigInt para string
    }
}