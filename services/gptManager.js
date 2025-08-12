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

        // Determine media type: image or video
        const url = gpt.imageUrl || '';
        const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
        let mediaEl;
        if (isVideo) {
            mediaEl = document.createElement('video');
            mediaEl.src = url;
            // iOS Safari inline autoplay support
            mediaEl.setAttribute('playsinline', '');
            mediaEl.setAttribute('webkit-playsinline', '');
            // Custom video behavior: no controls, muted, loop, preload, style, always autoplay
            mediaEl.muted = true;
            mediaEl.loop = true;
            mediaEl.preload = 'metadata';
            mediaEl.autoplay = true;
            mediaEl.playsInline = true;
            // Ensure playback starts
            mediaEl.load();
            mediaEl.style.border = 'none';
            mediaEl.style.objectFit = 'contain';
            mediaEl.style.width = '100%';
            mediaEl.style.height = 'auto';
            const maxH = window.innerWidth < 768 ? '200px' : '300px';
            mediaEl.style.maxHeight = maxH;
            mediaEl.style.minHeight = maxH;
        } else {
            mediaEl = document.createElement('img');
            mediaEl.src = url || 'path/to/default-image.jpg';
            mediaEl.alt = `${gpt.name} Image`;
            mediaEl.classList.add('card-img-top', 'gpt-image');
            mediaEl.setAttribute('loading', 'lazy');
            mediaEl.style.objectFit = 'contain';
            mediaEl.style.width = '100%';
            mediaEl.style.height = 'auto';
            const maxH = window.innerWidth < 768 ? '150px' : '300px';
            mediaEl.style.maxHeight = maxH;
        }
        cardDiv.appendChild(mediaEl);

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

        cardDiv.appendChild(cardBody);

        // Spinner overlay element (hidden by default)
        const spinnerOverlay = document.createElement('div');
        spinnerOverlay.classList.add('spinner-overlay', 'd-none');
        spinnerOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:rgba(255,255,255,0.7);';
        spinnerOverlay.innerHTML = '<div class="gpt-loading-bar" role="status"><span class="visually-hidden">Loading...</span></div>';
        cardDiv.appendChild(spinnerOverlay);

        // Removido o listener individual de clique do card; agora o clique é delegado no container.

        colDiv.appendChild(cardDiv);
        return colDiv;
    }

    /**
     * @private
     * Debounce utility to delay execution of a function.
     * @param {Function} fn - The function to debounce.
     * @param {number} delay - Delay in milliseconds.
     * @returns {Function} - Debounced function.
     */
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    createModal() {
        if (document.getElementById('gpt-modal')) {
            if (DEBUG_MODE) console.log('Modal já existe.');
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
                            <div class="input-group mb-3">
                                <input 
                                    type="text" 
                                    id="gpt-search" 
                                    class="form-control" 
                                    placeholder="Pesquisar GPT..."
                                >
                                <button class="btn btn-outline-secondary" type="button" id="gpt-clear-search" aria-label="Limpar pesquisa">×</button>
                            </div>
                            <div class="row" id="gpt-list">
                                <!-- Skeletons enquanto carrega -->
                                <div class="col-12 col-sm-6 col-lg-4 mb-4 gpt-skeleton" aria-hidden="true">
                                    <div class="card" style="height: 320px; opacity: 0.6;">
                                        <div class="card-img-top" style="height: 200px; background: #2b2b2b;"></div>
                                        <div class="card-body">
                                            <div style="height: 20px; background:#2b2b2b; margin-bottom: 8px;"></div>
                                            <div style="height: 12px; background:#2b2b2b; width: 80%;"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-sm-6 col-lg-4 mb-4 gpt-skeleton" aria-hidden="true">
                                    <div class="card" style="height: 320px; opacity: 0.6;">
                                        <div class="card-img-top" style="height: 200px; background: #2b2b2b;"></div>
                                        <div class="card-body">
                                            <div style="height: 20px; background:#2b2b2b; margin-bottom: 8px;"></div>
                                            <div style="height: 12px; background:#2b2b2b; width: 60%;"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-sm-6 col-lg-4 mb-4 gpt-skeleton" aria-hidden="true">
                                    <div class="card" style="height: 320px; opacity: 0.6;">
                                        <div class="card-img-top" style="height: 200px; background: #2b2b2b;"></div>
                                        <div class="card-body">
                                            <div style="height: 20px; background:#2b2b2b; margin-bottom: 8px;"></div>
                                            <div style="height: 12px; background:#2b2b2b; width: 70%;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
            gptModalElement.setAttribute('aria-hidden', 'false'); // Corrige acessibilidade ao abrir
        });
        gptModalElement.addEventListener('shown.bs.modal', () => {
            const searchInput = document.getElementById('gpt-search');
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
        });
        gptModalElement.addEventListener('hidden.bs.modal', () => {
            gptModalElement.setAttribute('aria-hidden', 'true'); // Corrige acessibilidade ao fechar
            const chatInput = document.querySelector('textarea.text-input');
            if (chatInput) {
                chatInput.focus();
            } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
                lastFocusedElement.focus();
            }
        });

        const searchInput = document.getElementById('gpt-search');
        const debouncedFilter = this.debounce((event) => {
            const searchTerm = event.target.value;
            const activeCategoryBadge = document.querySelector('.category-tag.bg-success') || document.querySelector('.category-tag[data-category="all"]');
            const activeCategory = activeCategoryBadge.dataset.category;
            this.filterGPTList(searchTerm, activeCategory);
        }, 300);
        searchInput.addEventListener('input', debouncedFilter);

        // Clear button functionality
        const clearBtn = document.getElementById('gpt-clear-search');
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            // Reset filter to current category
            const activeCategoryBadge = document.querySelector('.category-tag.bg-success') || document.querySelector('.category-tag[data-category="all"]');
            const activeCategory = activeCategoryBadge.dataset.category;
            this.filterGPTList('', activeCategory);
            searchInput.focus();
        });

        this.initializeCategories();

        // Event Delegation for GPT card clicks
        const gptListContainer = document.getElementById('gpt-list');
        if (gptListContainer) {
            gptListContainer.addEventListener('click', async (event) => {
                const cardDiv = event.target.closest('.gpt-card');
                if (!cardDiv) return;
                const gptId = cardDiv.dataset.gptId;
                const allGpts = this.stateManager.getGPTs() || [];
                const selectedGpt = allGpts.find(g => String(g.id) === String(gptId));
                if (!selectedGpt) {
                    console.error('GPT não encontrado para id', gptId);
                    return;
                }
                await this.handleGPTSelection(event, selectedGpt, cardDiv);
            });
        }
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
        // Reset container
        categoriesContainer.textContent = '';
        // Create "Todas" badge
        const allCategoryBadge = document.createElement('span');
        allCategoryBadge.classList.add('badge', 'bg-secondary', 'cursor-pointer', 'category-tag');
        allCategoryBadge.dataset.category = 'all';
        allCategoryBadge.textContent = 'Todas';
        allCategoryBadge.addEventListener('click', () => {
            this.filterByCategory('all');
            this.updateActiveCategory('all');
        });
        categoriesContainer.appendChild(allCategoryBadge);
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

        // Reset container and add "Todas" badge
        categoriesContainer.textContent = '';
        const allCategoryBadge = document.createElement('span');
        allCategoryBadge.classList.add('badge', 'bg-secondary', 'cursor-pointer', 'category-tag');
        allCategoryBadge.dataset.category = 'all';
        allCategoryBadge.textContent = 'Todas';
        categoriesContainer.appendChild(allCategoryBadge);

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
            debugLog && console.log('');
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
            if (DEBUG_MODE) console.log('A lista de GPTs já está sendo carregada.');
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

        // Limpa skeletons
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

        // Limpa skeletons
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

        if (!gpt.id) {
            console.error('GPT selecionado não possui um id válido.');
            return;
        }

        // 1) Garantir que o usuário tem permissão: gpt precisa existir na lista carregada
        const allowedGpts = this.stateManager.getGPTs && this.stateManager.getGPTs();
        const isAllowed = Array.isArray(allowedGpts) && allowedGpts.some(item => String(item.id) === String(gpt.id));
        if (!isAllowed) {
            this.uiManager.showError('Você não tem permissão para usar este GPT.');
            return;
        }

        // 2) Buscar configuração; se falhar ou não vier flowiseConfig, abortar
        try {
            await this.fetchGPTConfig(gpt.id);
        } catch (e) {
            // fetchGPTConfig já loga/mostra erro; apenas aborta
            return;
        }

        const flowiseCfg = this.stateManager.getFlowiseConfig && this.stateManager.getFlowiseConfig();
        if (!flowiseCfg || !flowiseCfg.chatflowId || !flowiseCfg.apiHost) {
            this.uiManager.showError('Configuração do GPT indisponível. Contate o suporte.');
            return;
        }

        // 3) Criar sessão e iniciar UI somente após permissões e config válidas
        const newSessionId = this.generateSessionId();
        this.stateManager.setSessionId(newSessionId);

        const newChat = {
            id: newSessionId,
            name: gpt.name,
            date: new Date().toISOString(),
            fk_gpt_id: gpt.id
        };
        this.stateManager.addChat(newChat);
        this.uiManager.chatManager.populateChatMenu(this.stateManager.chats);

        if (this.uiManager.chatManager && typeof this.uiManager.chatManager.updateUrlWithChatId === 'function') {
            this.uiManager.chatManager.updateUrlWithChatId(newSessionId, gpt.id);
        }

        await this.uiManager.initializeChatbot();

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