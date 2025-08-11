import { 
    getAuth, 
    updateProfile, 
    updatePassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth as sharedAuth } from './auth.js';

/**
 * @class ProfileManager
 * @classdesc Gerencia as informações de perfil do usuário autenticado.
 */
export default class ProfileManager {
    /**
     * @constructor
     * @param {Object} uiManager - Instância do UIManager para interação com a interface do usuário.
     */
    constructor(arg1, arg2) {
        // Usa a instância compartilhada do Auth
        this.auth = sharedAuth;

        // Compatibilidade: aceitar (uiManager) ou (auth, uiManager)
        this.uiManager = (arg2 !== undefined) ? arg2 : arg1; // Para exibição de mensagens
        this.modal = null; // Modal Bootstrap
        this.modalId = "profile-modal"; // ID do modal no DOM

        this.renderModal();
        this.addEventListeners();
    }

    /**
     * Renderiza o modal de gerenciamento de perfil.
     */
    renderModal() {
        if (document.getElementById(this.modalId)) {
            console.log("Modal de perfil já existe.");
            return;
        }

        const modalHTML = `
            <div class="modal fade lexi-profile-modal" id="${this.modalId}" tabindex="-1" aria-labelledby="profile-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content lexi-profile-modal-content">
                        <div class="modal-header lexi-profile-modal-header">
                            <h5 class="modal-title" id="profile-modal-title">Gerenciar Perfil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body lexi-profile-modal-body">
                            <form id="profile-form">
                                <div class="mb-3">
                                    <label for="profile-name" class="form-label">
                                        <i class="bi bi-person me-2"></i>Nome
                                    </label>
                                    <input type="text" id="profile-name" class="form-control" placeholder="Digite seu nome completo">
                                </div>
                                <div class="mb-3">
                                    <label for="profile-email" class="form-label">
                                        <i class="bi bi-envelope me-2"></i>Email
                                    </label>
                                    <input type="email" id="profile-email" class="form-control" placeholder="Seu email" readonly>
                                    <small class="form-text text-muted">
                                        <i class="bi bi-info-circle me-1"></i>O email não pode ser alterado
                                    </small>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-password" class="form-label">
                                        <i class="bi bi-lock me-2"></i>Nova Senha
                                    </label>
                                    <input type="password" id="profile-password" class="form-control" placeholder="Deixe em branco para manter a senha atual">
                                    <small class="form-text text-muted">
                                        <i class="bi bi-shield-check me-1"></i>Mínimo 6 caracteres
                                    </small>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">
                                    <i class="bi bi-check-circle me-2"></i>Salvar Alterações
                                </button>
                            </form>
                        </div>
                        <div class="modal-footer lexi-profile-modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        const modalElement = document.getElementById(this.modalId);
        this.modal = new bootstrap.Modal(modalElement);
    }

    /**
     * Adiciona eventos ao modal e ao formulário.
     */
    addEventListeners() {
        const profileForm = document.getElementById("profile-form");

        profileForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await this.saveProfile();
        });

        document.getElementById(this.modalId).addEventListener("show.bs.modal", () => {
            this.loadProfileData();
        });
    }

    /**
     * Carrega os dados do perfil do usuário autenticado.
     */
    loadProfileData() {
        const user = this.auth.currentUser;

        if (!user) {
            this.uiManager?.showError("Erro: Usuário não autenticado. Faça login novamente.");
            return;
        }

        const profileName = document.getElementById("profile-name");
        const profileEmail = document.getElementById("profile-email");

        profileName.value = user.displayName || "";
        profileEmail.value = user.email || "";
    }

    /**
     * Salva as alterações feitas no perfil do usuário.
     */
    async saveProfile() {
        const user = this.auth.currentUser;

        if (!user) {
            this.uiManager?.showError("Erro: Usuário não autenticado.");
            return;
        }

        const profileName = document.getElementById("profile-name").value.trim();
        const profilePassword = document.getElementById("profile-password").value.trim();
        const submitButton = document.querySelector("#profile-form button[type='submit']");

        // Validar se há alterações
        if (!profileName && !profilePassword) {
            this.uiManager?.showError("Nenhuma alteração foi feita.");
            return;
        }

        // Validar nome
        if (profileName && profileName.length < 2) {
            this.uiManager?.showError("O nome deve ter pelo menos 2 caracteres.");
            return;
        }

        // Validar senha
        if (profilePassword && profilePassword.length < 6) {
            this.uiManager?.showError("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        try {
            // Mostrar estado de carregamento
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add('btn-loading');
                submitButton.innerHTML = '<i class="bi bi-arrow-clockwise me-2"></i>Salvando...';
            }

            let hasChanges = false;

            if (profileName && profileName !== user.displayName) {
                await updateProfile(user, { displayName: profileName });
                console.log("Nome atualizado para:", profileName);
                hasChanges = true;
            }

            if (profilePassword) {
                await updatePassword(user, profilePassword);
                console.log("Senha atualizada com sucesso.");
                hasChanges = true;
            }

            if (hasChanges) {
                this.uiManager?.showSuccess("Perfil atualizado com sucesso!");
                this.modal.hide();
            } else {
                this.uiManager?.showError("Nenhuma alteração foi feita.");
            }
        } catch (error) {
            console.error("Erro ao salvar alterações do perfil:", error);
            
            // Mensagens de erro mais específicas
            let errorMessage = "Erro ao salvar alterações do perfil. Tente novamente.";
            
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = "Por segurança, faça login novamente para alterar sua senha.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "A senha é muito fraca. Use uma senha mais forte.";
            } else if (error.code === 'auth/invalid-display-name') {
                errorMessage = "O nome contém caracteres inválidos.";
            }
            
            this.uiManager?.showError(errorMessage);
        } finally {
            // Restaurar estado do botão
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('btn-loading');
                submitButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Salvar Alterações';
            }
        }
    }

    /**
     * Monitora mudanças no estado de autenticação.
     */
    monitorAuthState() {
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log("Usuário autenticado:", user);
            } else {
                console.error("Usuário não autenticado.");
            }
        });
    }

    /**
     * Abre o modal de perfil.
     */
    openModal() {
        if (!this.modal) {
            console.error("Modal de perfil não inicializado.");
            return;
        }
        this.modal.show();
    }
}