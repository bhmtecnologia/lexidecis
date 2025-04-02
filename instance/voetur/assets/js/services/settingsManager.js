/**
 * @file settingsManager.js
 * @description 
 * Este módulo gerencia a interface e os eventos do modal de configurações.
 * Ele adiciona um botão de configurações à barra lateral e gerencia o modal correspondente.
 *
 * @module settingsManager
 */

import { showToast } from './notificationManager.js';

export default class SettingsManager {
    /**
     * @constructor
     * @param {ApiService} apiService - Instância do serviço de API.
     * @param {StateManager} stateManager - Gerenciador de estado da aplicação.
     * @param {UIManager} uiManager - Gerenciador da interface do usuário.
     * @param {Object} config - Objeto de configuração vindo do renderer.js.
     */
    constructor(apiService, stateManager, uiManager, config) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.uiManager = uiManager;
        this.config = config;

        /** @type {bootstrap.Modal|null} */
        this.modal = null;

        // Inicializa os componentes
        this.init();
    }

    /**
     * Método de inicialização para configurar o modal e o botão de configurações.
     * @private
     */
    init() {
        this.createModal();
        this.addSettingsButton();
    }

    /**
     * Adiciona o botão de configurações na barra lateral.
     * @private
     */
    addSettingsButton() {
        const buttonContainer = document.querySelector('.d-flex.justify-content-around.mb-3');
        if (!buttonContainer) {
            console.error('Container de botões não encontrado. Verifique a estrutura do HTML.');
            return;
        }

        // Evita adicionar múltiplos botões
        if (document.getElementById('settings-button')) {
            console.warn('Botão de Configurações já existe.');
            return;
        }

        const settingsButton = document.createElement('button');
        settingsButton.id = 'settings-button';
        settingsButton.classList.add('btn', 'btn-link', 'text-white');
        settingsButton.setAttribute('aria-label', 'Configurações'); // Melhor acessibilidade
        settingsButton.innerHTML = `<i class="bi bi-gear" style="font-size: 1.5rem;"></i>`;

        // Tooltip (inicializa somente se necessário)
        new bootstrap.Tooltip(settingsButton, {
            title: 'Configurações',
            placement: 'bottom'
        });

        settingsButton.addEventListener('click', () => this.openModal());

        buttonContainer.appendChild(settingsButton);
    }

    /**
     * Cria dinamicamente o modal de configurações na interface.
     * @private
     */
    createModal() {
        const existingModal = document.getElementById('settings-modal');
        if (existingModal) {
            console.log('Modal de Configurações já existe.');
            this.modal = new bootstrap.Modal(existingModal);
            return;
        }

        const modalHtml = `
            <div class="modal fade" id="settings-modal" tabindex="-1" aria-labelledby="settings-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="settings-modal-title">Configurações</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Formulário de Configurações -->
                            <form id="settings-form" novalidate>
                                <div class="mb-3">
                                    <label for="theme-select" class="form-label">Tema</label>
                                    <select class="form-select" id="theme-select" required>
                                        <option value="light">Claro</option>
                                        <option value="dark">Escuro</option>
                                    </select>
                                    <div class="invalid-feedback">
                                        Por favor, selecione um tema.
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="notifications-toggle" class="form-label">Notificações</label>
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="notifications-toggle">
                                        <label class="form-check-label" for="notifications-toggle">Ativar Notificações</label>
                                    </div>
                                </div>
                                <!-- Adicione mais campos de configuração conforme necessário -->
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="save-settings-button">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById('settings-modal');
        this.modal = new bootstrap.Modal(modalElement);

        // Event delegation para otimizar o gerenciamento de eventos
        modalElement.querySelector('#save-settings-button').addEventListener('click', () => this.saveSettings());

        // Opcional: Resetar o formulário ao fechar o modal
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.querySelector('#settings-form').reset();
            this.loadSettings(); // Recarrega as configurações para refletir o estado atual
        });
    }

    /**
     * Abre o modal de configurações.
     * @public
     */
    openModal() {
        if (this.modal) {
            this.loadSettings();
            this.modal.show();
        } else {
            console.error('Modal de Configurações não está inicializado.');
        }
    }

    /**
     * Carrega as configurações atuais e atualiza o formulário.
     * @private
     */
    loadSettings() {
        const form = document.getElementById('settings-form');
        if (!form) {
            console.error('Formulário de configurações não encontrado.');
            return;
        }

        // Carregar o tema atual
        const currentTheme = this.stateManager.getSetting('theme') || 'light';
        form.querySelector('#theme-select').value = currentTheme;

        // Carregar o estado das notificações
        const notificationsEnabled = this.stateManager.getSetting('notifications') || false;
        form.querySelector('#notifications-toggle').checked = notificationsEnabled;

        // Carregar outras configurações conforme necessário
    }

    /**
     * Salva as configurações do formulário.
     * @async
     * @private
     */
    async saveSettings() {
        const form = document.getElementById('settings-form');
        if (!form) {
            console.error('Formulário de configurações não encontrado.');
            return;
        }

        // Validação básica do formulário
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const theme = form.querySelector('#theme-select').value;
        const notifications = form.querySelector('#notifications-toggle').checked;

        // Atualizar o estado local
        this.stateManager.setSetting('theme', theme);
        this.stateManager.setSetting('notifications', notifications);

        // Aplicar as configurações imediatamente
        this.applySettings();

        // Preparar os parâmetros para a API
        const params = {
            company_name: this.config.companyName,
            user_name: this.config.userName,
            user_id: this.config.userId,
            settings: {
                theme,
                notifications
                // Adicione mais configurações conforme necessário
            }
        };

        try {
            const response = await this.apiService.request('updateSettings', params, 'POST');
            if (response.status === 'success') {
                showToast('Configurações salvas com sucesso.', 'success');
                this.modal.hide();
            } else {
                throw new Error(response.message || 'Erro desconhecido.');
            }
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.uiManager.showError('Erro ao salvar configurações. Por favor, tente novamente mais tarde.');
        }
    }

    /**
     * Aplica as configurações carregadas à interface.
     * @private
     */
    applySettings() {
        const theme = this.stateManager.getSetting('theme') || 'light';
        const bodyClassList = document.body.classList;

        if (theme === 'dark') {
            bodyClassList.add('bg-dark', 'text-white');
            // Adicione mais ajustes de tema conforme necessário
        } else {
            bodyClassList.remove('bg-dark', 'text-white');
            // Remova ou ajuste outras classes conforme necessário
        }

        const notifications = this.stateManager.getSetting('notifications') || false;
        if (notifications) {
            // Implementação específica para habilitar notificações
            console.log('Notificações ativadas.');
            // Exemplo: Iniciar serviços de notificação
        } else {
            // Implementação específica para desabilitar notificações
            console.log('Notificações desativadas.');
            // Exemplo: Parar serviços de notificação
        }

        // Aplique outras configurações conforme necessário
    }
}