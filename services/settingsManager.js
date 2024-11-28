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

        /**
         * @type {bootstrap.Modal|undefined}
         * @description Instância do modal Bootstrap para configurações.
         */
        this.modal = null;

        // Inicializa o modal na interface, caso não exista
        this.createModal();

        // Adiciona o botão de configurações na barra lateral
        this.addSettingsButton();
    }

    /**
     * Adiciona o botão de configurações na barra lateral.
     * @method
     */
    addSettingsButton() {
        // Localiza o container onde os botões estão inseridos
        const buttonContainer = document.querySelector('.d-flex.justify-content-around.mb-3');
        if (!buttonContainer) {
            console.error('Container de botões não encontrado. Verifique a estrutura do HTML.');
            return;
        }

        // Cria o botão de configurações
        const settingsButton = document.createElement('button');
        settingsButton.id = 'settings-button';
        settingsButton.classList.add('btn', 'btn-link', 'text-white');
        settingsButton.setAttribute('data-bs-toggle', 'tooltip');
        settingsButton.setAttribute('data-bs-placement', 'bottom');
        settingsButton.setAttribute('title', 'Configurações');
        settingsButton.innerHTML = `<i class="bi bi-gear" style="font-size: 1.5rem;"></i>`;

        // Adiciona evento de clique para abrir o modal
        settingsButton.addEventListener('click', () => this.openModal());

        // Adiciona o botão ao container
        buttonContainer.appendChild(settingsButton);
    }

    /**
     * Cria dinamicamente o modal de configurações na interface.
     * @method
     */
    createModal() {
        if (document.getElementById('settings-modal')) {
            console.log('Modal de Configurações já existe.');
            this.modal = new bootstrap.Modal(document.getElementById('settings-modal'));
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
                            <form id="settings-form">
                                <div class="mb-3">
                                    <label for="theme-select" class="form-label">Tema</label>
                                    <select class="form-select" id="theme-select">
                                        <option value="light">Claro</option>
                                        <option value="dark">Escuro</option>
                                    </select>
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
        this.modal = new bootstrap.Modal(document.getElementById('settings-modal'));

        // Adiciona evento de clique no botão de salvar
        document.getElementById('save-settings-button').addEventListener('click', () => this.saveSettings());
    }

    /**
     * Abre o modal de configurações.
     * @method
     */
    openModal() {
        if (this.modal) {
            this.loadSettings(); // Carrega as configurações atuais antes de abrir
            this.modal.show();
        } else {
            console.error('Modal de Configurações não está inicializado.');
        }
    }

    /**
     * Carrega as configurações atuais e atualiza o formulário.
     * @method
     */
    loadSettings() {
        // Carregar o tema atual
        const currentTheme = this.stateManager.getSetting('theme') || 'light';
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = currentTheme;
        }

        // Carregar o estado das notificações
        const notificationsEnabled = this.stateManager.getSetting('notifications') || false;
        const notificationsToggle = document.getElementById('notifications-toggle');
        if (notificationsToggle) {
            notificationsToggle.checked = notificationsEnabled;
        }

        // Carregar outras configurações conforme necessário
    }

    /**
     * Salva as configurações do formulário.
     * @async
     * @method
     */
    async saveSettings() {
        const theme = document.getElementById('theme-select').value;
        const notifications = document.getElementById('notifications-toggle').checked;

        // Atualizar o estado
        this.stateManager.setSetting('theme', theme);
        this.stateManager.setSetting('notifications', notifications);

        // Aplicar as configurações imediatamente
        this.applySettings();

        // Enviar as configurações para a API
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
            this.uiManager.showError('Erro ao salvar configurações. Verifique o console para mais detalhes.');
        }
    }

    /**
     * Aplica as configurações carregadas.
     * @method
     */
    applySettings() {
        const theme = this.stateManager.getSetting('theme') || 'light';
        if (theme === 'dark') {
            document.body.classList.add('bg-dark', 'text-white');
            // Adicione mais ajustes de tema conforme necessário
        } else {
            document.body.classList.remove('bg-dark', 'text-white');
            // Remova ou ajuste outras classes conforme necessário
        }

        const notifications = this.stateManager.getSetting('notifications') || false;
        if (notifications) {
            // Habilitar notificações (implementação específica depende da sua aplicação)
            console.log('Notificações ativadas.');
            // Exemplo: Iniciar notificações ou alterar o estado de notificações
        } else {
            // Desabilitar notificações
            console.log('Notificações desativadas.');
            // Exemplo: Parar notificações ou alterar o estado de notificações
        }

        // Aplique outras configurações conforme necessário
    }
}