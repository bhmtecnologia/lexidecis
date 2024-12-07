/**
 * @class GPTManager
 * @classdesc Gerencia a interação com os GPTs, incluindo carregamento, seleção e configuração.
 */
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

        /**
         * @type {bootstrap.Modal|undefined}
         * @description Instância do modal Bootstrap para seleção de GPTs.
         */
        this.modal = null;

        /**
         * @type {boolean}
         * @description Indica se eventos estão bloqueados para evitar seleções simultâneas.
         */
        this.isEventLocked = false;

        // Inicializa o modal na interface, caso não exista
        this.createModal();
    }

    /**
     * Cria dinamicamente o modal de seleção de GPT na interface com duas colunas e categorias.
     */
    createModal() {
        if (document.getElementById('gpt-modal')) {
            console.log('Modal já existe.');
            return;
        }

        const modalHtml = `
            <div class="modal fade" id="gpt-modal" tabindex="-1" aria-labelledby="gpt-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="gpt-modal-title">Explorar GPTs</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Barra de Categorias/Tags -->
                            <div class="mb-4">
                                <div id="gpt-categories" class="d-flex flex-wrap gap-2">
                                    <!-- Categorias serão inseridas aqui dinamicamente -->
                                </div>
                            </div>
                            <!-- Campo de Busca -->
                            <div class="mb-3">
                                <input 
                                    type="text" 
                                    id="gpt-search" 
                                    class="form-control" 
                                    placeholder="Pesquisar GPT..."
                                >
                            </div>
                            <!-- Lista de GPTs em duas colunas -->
                            <div class="row" id="gpt-list">
                                <!-- Itens de GPT serão inseridos aqui dinamicamente -->
                            </div>
                        </div>
                        <!-- Adição da Seção de Rodapé com Botão Fechar -->
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insere o modal no DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const gptModalElement = document.getElementById('gpt-modal');

        // Inicializa o modal corretamente usando getOrCreateInstance
        this.modal = bootstrap.Modal.getOrCreateInstance(gptModalElement);

        // Reatribui eventos aos elementos com data-bs-dismiss="modal"
        this.reassignModalEvents(gptModalElement);

        // Adiciona evento de input ao campo de busca
        const searchInput = document.getElementById('gpt-search');
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            const activeCategoryBadge = document.querySelector('.category-tag.bg-success') || document.querySelector('.category-tag[data-category="all"]');
            const activeCategory = activeCategoryBadge.dataset.category;
            console.log('Evento de input acionado:', searchTerm); // Debug do input
            this.filterGPTList(searchTerm, activeCategory);
        });

        // Inicializa as categorias
        this.initializeCategories();
    }

    /**
     * Reatribui os eventos do Bootstrap aos elementos do modal após inserção dinâmica.
     * @param {HTMLElement} modalElement - O elemento do modal recém-inserido.
     */
    reassignModalEvents(modalElement) {
        // Seleciona todos os elementos com data-bs-dismiss="modal"
        const dismissElements = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
        dismissElements.forEach((element) => {
            element.addEventListener('click', () => {
                this.modal.hide();
            });
        });
    }

    /**
     * Inicializa e renderiza as categorias/tags no modal.
     */
    initializeCategories() {
        // Inicialmente, as categorias não estão carregadas. Será populado após carregar GPTs.
        const categoriesContainer = document.getElementById('gpt-categories');
        categoriesContainer.innerHTML = '<span class="badge bg-secondary cursor-pointer category-tag" data-category="all">Todas</span>';
    }

    /**
     * Popula as categorias com base nos GPTs recebidos.
     * @param {Array<Object>} gpts - Lista de GPTs recebida da API.
     */
    populateCategories(gpts) {
        const categoriesContainer = document.getElementById('gpt-categories');
        if (!categoriesContainer) {
            console.error('Elemento gpt-categories não encontrado.');
            return;
        }

        // Extrai categorias únicas
        const categories = new Set();
        gpts.forEach(gpt => {
            if (gpt.category) {
                categories.add(gpt.category);
            }
        });

        // Limpa categorias existentes, mantendo 'Todas'
        categoriesContainer.innerHTML = '<span class="badge bg-secondary cursor-pointer category-tag" data-category="all">Todas</span>';

        // Adiciona categorias
        categories.forEach(category => {
            const categoryBadge = document.createElement('span');
            categoryBadge.classList.add('badge', 'bg-primary', 'cursor-pointer', 'category-tag');
            categoryBadge.textContent = category;
            categoryBadge.dataset.category = category;

            // Adiciona evento de clique para filtragem
            categoryBadge.addEventListener('click', () => {
                this.filterByCategory(category);
                // Atualiza a aparência das categorias para indicar a selecionada
                this.updateActiveCategory(category);
            });

            categoriesContainer.appendChild(categoryBadge);
        });

        // Adiciona evento para 'Todas'
        const allCategory = categoriesContainer.querySelector('[data-category="all"]');
        allCategory.addEventListener('click', () => {
            this.filterByCategory('all');
            this.updateActiveCategory('all');
        });
    }

    /**
     * Atualiza a aparência das categorias para indicar a selecionada.
     * @param {string} activeCategory - Categoria atualmente selecionada.
     */
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

    /**
     * Filtra a lista de GPTs com base na categoria selecionada.
     * @param {string} category - Categoria selecionada.
     */
    filterByCategory(category) {
        const searchTerm = document.getElementById('gpt-search').value;
        this.filterGPTList(searchTerm, category);
    }

    /**
     * Abre o modal para seleção de um GPT.
     * @async
     * @returns {Promise<void>}
     */
    async openModal() {
        showAlert('Carregando lista de GPTs...', 'info');
        //showToast('Carregando lista de GPTs...', 'info');

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
            user_id: this.config.userId,
        };

        try {
            const gptData = await this.apiService.request('readGPT', params, 'GET');
            console.log('Lista de GPTs:', gptData);
            this.populateCategories(gptData); // Popula as categorias
            this.populateGPTMenu(gptData);
        } catch (error) {
            console.error('Erro ao carregar lista de GPTs:', error);
            this.uiManager.showError('Erro ao carregar a lista de GPTs. Verifique o console para mais detalhes.');
        } finally {
            this.stateManager.setLoadingGPTs(false);
        }
    }

    /**
     * Popula o menu de seleção de GPTs na interface em duas colunas.
     * @param {Array<Object>} gpts - Lista de GPTs recebida da API.
     */
    populateGPTMenu(gpts) {
        const gptList = document.getElementById('gpt-list');
        if (!gptList) {
            console.error('Elemento gpt-list não encontrado.');
            return;
        }

        gptList.innerHTML = ''; // Garante que a lista está limpa antes de adicionar itens.

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

            const colDiv = document.createElement('div');
            colDiv.classList.add('col-md-6', 'mb-4');

            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card', 'gpt-card', 'h-100', 'd-flex', 'flex-column');
            cardDiv.dataset.gptId = gpt.id;
            cardDiv.dataset.category = gpt.category || 'Sem Categoria';

            // Imagem do GPT
            const img = document.createElement('img');
            img.src = gpt.imageUrl || 'path/to/default-image.jpg'; // Substitua pelo caminho padrão
            img.classList.add('card-img-top', 'gpt-image');
            img.alt = `${gpt.name} Image`;

            // Corpo do cartão
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

            // Adiciona evento de clique para seleção de GPT
            cardDiv.addEventListener('click', async (event) => {
                await this.handleGPTSelection(event, gpt, cardDiv);
            });

            colDiv.appendChild(cardDiv);
            fragment.appendChild(colDiv);
        });

        gptList.appendChild(fragment);
    }

    /**
     * Filtra a lista de GPTs com base no termo de busca e na categoria selecionada.
     * @param {string} searchTerm - Termo de busca inserido pelo usuário.
     * @param {string} category - Categoria selecionada.
     */
    filterGPTList(searchTerm, category = 'all') {
        const gptListItems = document.querySelectorAll('#gpt-list .gpt-card');

        if (!gptListItems) {
            console.error('Nenhum item encontrado na lista de GPTs.');
            return;
        }

        const searchQuery = searchTerm.toLowerCase();
        const selectedCategory = category.toLowerCase();

        console.log('Termo de busca:', searchQuery);
        console.log('Categoria selecionada:', selectedCategory);

        gptListItems.forEach((item) => {
            const nameElement = item.querySelector('.card-title');
            const descriptionElement = item.querySelector('.card-text');

            const name = nameElement?.textContent.toLowerCase() || '';
            const description = descriptionElement?.textContent.toLowerCase() || '';
            const itemCategory = item.dataset.category.toLowerCase();

            const matchesSearch = name.includes(searchQuery) || description.includes(searchQuery);
            const matchesCategory = (selectedCategory === 'all') || (itemCategory === selectedCategory);

            if (matchesSearch && matchesCategory) {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        });
    }

    /**
     * Gerencia a seleção de um GPT.
     * @param {Event} event - Evento de clique.
     * @param {Object} gpt - Objeto GPT selecionado.
     * @param {HTMLElement} gptItem - Elemento DOM do GPT selecionado.
     * @async
     * @returns {Promise<void>}
     */
    async handleGPTSelection(event, gpt, gptItem) {
        event.preventDefault();
        showAlert('GPT selecionado com sucesso.', 'success');
        //showToast('Selecionando GPT...', 'info');

        if (this.isEventLocked || this.stateManager.isGPTSelectionLoadingActive()) {
            console.log('A seleção de GPT está bloqueada.');
            return;
        }

        console.log('Bloqueio ativado: iniciando seleção de GPT.');
        this.isEventLocked = true;
        this.stateManager.setGPTSelectionLoading(true);

        try {
            gptItem.classList.add('loading');
            await this.selectGPTItem(gpt);
        } catch (error) {
            console.error('Erro ao selecionar GPT:', error);
            showAlert('Erro ao selecionar GPT. Por favor, tente novamente.', 'info');
            //showToast('Erro ao selecionar GPT. Por favor, tente novamente.', 'danger');
        } finally {
            this.isEventLocked = false;
            this.stateManager.setGPTSelectionLoading(false);
            gptItem.classList.remove('loading');
        }
    }

    /**
     * Seleciona um GPT e realiza as operações necessárias.
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
                const defaultChat = {
                    id: this.stateManager.currentSessionId,
                    name: gpt.name,
                    date: new Date().toISOString(),
                };
                this.stateManager.addChat(defaultChat);
                this.uiManager.populateChatMenu(this.stateManager.chats);
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
     * Busca as configurações detalhadas do GPT selecionado.
     * @param {string} gptId - ID do GPT selecionado.
     * @async
     * @returns {Promise<void>}
     */
    async fetchGPTConfig(gptId) {
        const params = {
            gpt_id: gptId,
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId,
        };

        try {
            const configData = await this.apiService.request('overrideConfig', params, 'GET');
            console.log('Configurações do GPT:', configData);

            const aggregatedConfig = configData.reduce((acc, current) => ({ ...acc, ...current.value }), {});

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
        return crypto.randomUUID();
    }
}