const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

import { showRenamePrompt, showAlert, showDeleteConfirmation } from './alertManager.js';

export default class GPTManager {
    /**
     * @constructor
     * @param {ApiService} apiService - Instância do ApiService para realizar requisições à API.
     * @param {StateManager} stateManager - Instância do StateManager para gerenciar o estado da aplicação.
     * @param {UIManager} uiManager - Instância do UIManager para interação com a interface do usuário.
     * @param {Object} config - Objeto de configuração vindo do renderer.js.
     */
    constructor(apiService, stateManager, uiManager, config) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.uiManager = uiManager;
        this.config = config;

        this.modal = null;
        this.isEventLocked = false;

        this.createModal();
    }

    /**
     * @private
     * Monta e retorna um elemento colDiv com card de GPT.
     * @param {Object} gpt - Objeto GPT com id, name, description, category, imageUrl e enabled.
     * @returns {HTMLDivElement}
     */
    createGptCard(gpt) {
        const colDiv = document.createElement('div');
        colDiv.classList.add('col-12', 'col-sm-6', 'col-lg-4', 'mb-4');

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card', 'gpt-card', 'h-100', 'd-flex', 'flex-column');
        // Prepare card for spinner overlay
        cardDiv.style.position = 'relative';
        cardDiv.dataset.gptId = gpt.id;
        cardDiv.dataset.category = gpt.category || 'Sem Categoria';

        const img = document.createElement('img');
        img.src = gpt.imageUrl || 'path/to/default-image.jpg';
        img.classList.add('card-img-top', 'gpt-image');
        // estilos responsivos devem estar no CSS
        img.style.objectFit = 'contain';
        img.style.width = '100%';
        img.style.height = 'auto';
        const maxHeight = window.innerWidth < 768 ? '150px' : '300px';
        img.style.maxHeight = maxHeight;
        img.alt = `${gpt.name} Image`;
        img.setAttribute('loading', 'lazy');

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body', 'd-flex', 'flex-column');

        const title = document.createElement('h5');
        title.classList.add('card-title');
        title.textContent = gpt.name;

        const description = document.createElement('p');
        description.classList.add('card-text', 'text-muted');
        description.textContent = gpt.description || 'Sem descrição disponível.';

        cardBody.appendChild(title);
        cardBody.appendChild(description);

        cardDiv.appendChild(img);
        cardDiv.appendChild(cardBody);

        // Spinner overlay element (hidden by default)
        const spinnerOverlay = document.createElement('div');
        spinnerOverlay.classList.add('spinner-overlay', 'd-none');
        spinnerOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:rgba(255,255,255,0.7);';
        spinnerOverlay.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';
        cardDiv.appendChild(spinnerOverlay);

        cardDiv.addEventListener('click', async (event) => {
            await this.handleGPTSelection(event, gpt, cardDiv);
        });

        colDiv.appendChild(cardDiv);
        return colDiv;
    }

    createModal() {
        if (document.getElementById('gpt-modal')) {
            console.log('Modal já existe.');
            return;
        }

        const modalHtml = `
            <div class="modal fade" id="gpt-modal" role="dialog" aria-modal="true" tabindex="-1" aria-labelledby="gpt-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="gpt-modal-title">Explorar GPTs</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-4">
                                <div id="gpt-categories" class="d-flex flex-wrap gap-2"></div>
                            </div>
                            <div class="mb-3">
                                <input 
                                    type="text" 
                                    id="gpt-search" 
                                    class="form-control" 
                                    placeholder="Pesquisar GPT..."
                                >
                            </div>
                            <div class="row" id="gpt-list"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const gptModalElement = document.getElementById('gpt-modal');
        this.modal = bootstrap.Modal.getOrCreateInstance(gptModalElement);
        this.reassignModalEvents(gptModalElement);

        // Accessibility: trap focus inside modal and return focus after close
        let lastFocusedElement;
        gptModalElement.addEventListener('show.bs.modal', () => {
            lastFocusedElement = document.activeElement;
        });
        gptModalElement.addEventListener('shown.bs.modal', () => {
            const searchInput = document.getElementById('gpt-search');
            if (searchInput) searchInput.focus();
        });
        gptModalElement.addEventListener('hidden.bs.modal', () => {
            const chatInput = document.querySelector('textarea.text-input');
            if (chatInput) {
                chatInput.focus();
            } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }
        });

        const searchInput = document.getElementById('gpt-search');
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            const activeCategoryBadge = document.querySelector('.category-tag.bg-success') || document.querySelector('.category-tag[data-category="all"]');
            const activeCategory = activeCategoryBadge.dataset.category;
            this.filterGPTList(searchTerm, activeCategory);
        });

        this.initializeCategories();
    }

    reassignModalEvents(modalElement) {
        const dismissElements = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
        dismissElements.forEach((element) => {
            element.addEventListener('click', () => {
                this.modal.hide();
            });
        });
    }

    initializeCategories() {
        const categoriesContainer = document.getElementById('gpt-categories');
        categoriesContainer.innerHTML = '<span class="badge bg-secondary cursor-pointer category-tag" data-category="all">Todas</span>';
    }

    populateCategories(gpts) {
        const categoriesContainer = document.getElementById('gpt-categories');
        if (!categoriesContainer) {
            console.error('Elemento gpt-categories não encontrado.');
            return;
        }

        const categories = new Set();
        gpts.forEach(gpt => {
            if (gpt.category) {
                categories.add(gpt.category);
            }
        });

        categoriesContainer.innerHTML = '<span class="badge bg-secondary cursor-pointer category-tag" data-category="all">Todas</span>';

        categories.forEach(category => {
            const categoryBadge = document.createElement('span');
            categoryBadge.classList.add('badge', 'bg-primary', 'cursor-pointer', 'category-tag');
            categoryBadge.textContent = category;
            categoryBadge.dataset.category = category;
            categoryBadge.addEventListener('click', () => {
                this.filterByCategory(category);
                this.updateActiveCategory(category);
            });
            categoriesContainer.appendChild(categoryBadge);
        });

        const allCategory = categoriesContainer.querySelector('[data-category="all"]');
        allCategory.addEventListener('click', () => {
            this.filterByCategory('all');
            this.updateActiveCategory('all');
        });
    }

    updateActiveCategory(activeCategory) {
        const categories = document.querySelectorAll('.category-tag');
        categories.forEach(category => {
            if (category.dataset.category === activeCategory) {
                category.classList.remove('bg-primary', 'bg-secondary');
                category.classList.add('bg-success');
            } else {
                category.classList.remove('bg-success');
                if (category.dataset.category === 'all') {
                    category.classList.add('bg-secondary');
                } else {
                    category.classList.add('bg-primary');
                }
            }
        });
    }

    filterByCategory(category) {
        const searchTerm = document.getElementById('gpt-search').value;
        this.filterGPTList(searchTerm, category);
    }

    async openModal() {
        showAlert('Carregando lista de GPTs...', 'info');
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
            this.uiManager.showError('Erro ao abrir o modal de GPT. Verifique o console para mais detalhes.');
        }
    }

    async loadGPTList() {
        if (this.stateManager.isLoadingGPTsActive()) {
            console.log('A lista de GPTs já está sendo carregada.');
            return;
        }

        this.stateManager.setLoadingGPTs(true);

        const params = {
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId,
        };

        try {
            const gptData = await this.apiService.request('readGPT', params, 'GET');
            if (!Array.isArray(gptData)) {
                throw new Error('Dados de GPT recebidos não são um array.');
            }

            this.stateManager.setGPTs(gptData);
            this.populateCategories(gptData);
            this.populateGPTMenu(gptData);
        } catch (error) {
            console.error('Erro ao carregar lista de GPTs:', error);
            this.uiManager.showError('Erro ao carregar a lista de GPTs. Verifique o console para mais detalhes.');
        } finally {
            this.stateManager.setLoadingGPTs(false);
        }
    }

    populateGPTMenu(gpts) {
        const gptList = document.getElementById('gpt-list');
        if (!gptList) {
            console.error('Elemento gpt-list não encontrado.');
            return;
        }

        gptList.innerHTML = '';

        if (!gpts || gpts.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'Nenhum GPT encontrado.';
            emptyMessage.classList.add('text-center', 'w-100');
            gptList.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();
        gpts.forEach((gpt) => {
            if (!gpt.enabled) return;
            const colDiv = this.createGptCard(gpt);
            fragment.appendChild(colDiv);
        });
        gptList.appendChild(fragment);
    }

    filterGPTList(searchTerm, category = 'all') {
        const allGpts = this.stateManager.getGPTs() || [];
        const searchQuery = (searchTerm || '').toLowerCase();
        const selectedCategory = (category || 'all').toLowerCase();

        const filteredGpts = allGpts.filter((gpt) => {
            if (!gpt.enabled) return false;
            const name = (gpt.name || '').toLowerCase();
            const description = (gpt.description || '').toLowerCase();
            const itemCategory = (gpt.category || 'Sem Categoria').toLowerCase();
            const matchesSearch = name.includes(searchQuery) || description.includes(searchQuery);
            const matchesCategory = selectedCategory === 'all' || itemCategory === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        filteredGpts.sort((a, b) => a.name.localeCompare(b.name));
        this.renderFilteredGPTs(filteredGpts);
    }

    renderFilteredGPTs(gpts) {
        const gptList = document.getElementById('gpt-list');
        if (!gptList) {
            console.error('Elemento gpt-list não encontrado.');
            return;
        }

        gptList.innerHTML = '';

        if (gpts.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'Nenhum GPT encontrado.';
            emptyMessage.classList.add('text-center', 'w-100');
            gptList.appendChild(emptyMessage);
            return;
        }

        const fragment = document.createDocumentFragment();
        gpts.forEach((gpt) => {
            const colDiv = this.createGptCard(gpt);
            fragment.appendChild(colDiv);
        });
        gptList.appendChild(fragment);
    }

    async handleGPTSelection(event, gpt, gptItem) {
        event.preventDefault();
        showAlert('GPT selecionado com sucesso.', 'success');
        if (this.isEventLocked || this.stateManager.isGPTSelectionLoadingActive()) {
            console.log('A seleção de GPT está bloqueada.');
            return;
        }

        this.isEventLocked = true;
        this.stateManager.setGPTSelectionLoading(true);

        try {
            gptItem.classList.add('loading');
            // Show spinner
            const spinner = gptItem.querySelector('.spinner-overlay');
            if (spinner) spinner.classList.remove('d-none');
            await this.selectGPTItem(gpt);
        } catch (error) {
            console.error('Erro ao selecionar GPT:', error);
            showAlert('Erro ao selecionar GPT. Por favor, tente novamente.', 'info');
        } finally {
            this.isEventLocked = false;
            this.stateManager.setGPTSelectionLoading(false);
            gptItem.classList.remove('loading');
            // Hide spinner
            const spinner = gptItem.querySelector('.spinner-overlay');
            if (spinner) spinner.classList.add('d-none');
        }
    }

    async selectGPTItem(gpt) {
        this.stateManager.setSelectedGPT(gpt);

        if (gpt.id) {
            await this.fetchGPTConfig(gpt.id);

            if (!this.stateManager.currentSessionId) {
                this.stateManager.setSessionId(this.generateSessionId());
                const defaultChat = {
                    id: this.stateManager.currentSessionId,
                    name: gpt.name,
                    date: new Date().toISOString(),
                    fk_gpt_id: gpt.id
                };
                this.stateManager.addChat(defaultChat);
                this.uiManager.chatManager.populateChatMenu(this.stateManager.chats);
            }

            await this.uiManager.initializeChatbot();
        } else {
            console.error('GPT selecionado não possui um id válido.');
        }

        localStorage.setItem('selectedGPT', JSON.stringify(this.stateManager.selectedGPT));
        localStorage.setItem('selectedGPTId', this.stateManager.selectedGPTId);
        localStorage.setItem('gptConfig', JSON.stringify(this.stateManager.gptConfig));

        if (this.modal) {
            this.modal.hide();
        }
    }

    /**
     * Busca e agrega a configuração de GPT com fallback para a chave `flowise`.
     * @param {string} gptId - ID do GPT a ser buscado.
     */
    async fetchGPTConfig(gptId) {
        const params = {
            gpt_id: gptId,
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId,
        };

        try {
            // 'overrideConfig' deve retornar um array de objetos { value: { ... } }
            // Exemplo: [ { value: { systemMessage: "...", flowise: {...}, ...} } ]
            const configData = await this.apiService.request('overrideConfig', params, 'GET');

            // Aqui agregamos todos os "value" num único objeto
            // e garantimos que flowise ao menos seja um objeto vazio se não vier do servidor
            const aggregatedConfig = configData.reduce((acc, current) => {
                return {
                    ...acc,
                    ...current.value,
                    flowise: {
                        // Mantém flowise anterior OU pega o flowise atual OR define objeto vazio
                        ...acc.flowise,
                        ...current.value.flowise
                    }
                };
            }, {});

            this.stateManager.setGPTConfig(aggregatedConfig);
            debugLog("flowiseConfig definido:", this.stateManager.getFlowiseConfig());
        } catch (error) {
            console.error('Erro ao buscar configurações do GPT:', error);
            this.uiManager.showError('Erro ao buscar configurações do GPT. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Realiza o carregamento prévio dos GPTs sem exibir o modal.
     */
    async preloadGPTs() {
        try {
            await this.loadGPTList();
            debugLog('GPTs pré-carregados com sucesso.');
        } catch (error) {
            console.error('Erro ao pré-carregar GPTs:', error);
            this.uiManager.showError('Erro ao carregar GPTs. Verifique o console para mais detalhes.');
        }
    }

    generateSessionId() {
        return crypto.randomUUID();
    }

    /**
     * Obtém um GPT pelo seu ID.
     * @param {string} gptId - ID do GPT a ser buscado.
     * @returns {Object|null} - GPT encontrado ou null se não encontrado.
     */
    getGPTById(gptId) {
        const gpts = this.stateManager.getGPTs(); // Supondo que StateManager possui o método getGPTs
        debugLog('Buscando GPT com ID:', gptId);
        debugLog('Lista de GPTs:', gpts);
        if (!gpts || !Array.isArray(gpts)) {
            debugLog('Lista de GPTs não está disponível.');
            return null;
        }
        const foundGPT = gpts.find(gpt => gpt.id === gptId) || null;
        debugLog('GPT encontrado:', foundGPT);
        return foundGPT;
    }
}