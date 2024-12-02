import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getAuth, 
    updateProfile, 
    updatePassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/**
 * @class ProfileManager
 * @classdesc Gerencia as informações de perfil do usuário autenticado.
 */
export default class ProfileManager {
    /**
     * @constructor
     * @param {Object} uiManager - Instância do UIManager para interação com a interface do usuário.
     */
    constructor(uiManager) {
        // Configuração do Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyD7Gh-UfV-LyueKtlUcY9nny_o-UWmlmJM",
            authDomain: "lexidecis.firebaseapp.com",
            projectId: "lexidecis",
            storageBucket: "lexidecis.firebasestorage.app",
            messagingSenderId: "267899611161",
            appId: "1:267899611161:web:6d1160f5ade72515ee6288",
            measurementId: "G-0QSNF8MKR1"
        };

        // Inicialização do Firebase
        this.firebaseApp = initializeApp(firebaseConfig);
        this.auth = getAuth(this.firebaseApp);

        this.uiManager = uiManager; // Para exibição de mensagens
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
            <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-labelledby="profile-modal-title" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="profile-modal-title">Gerenciar Perfil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            <form id="profile-form">
                                <div class="mb-3">
                                    <label for="profile-name" class="form-label">Nome</label>
                                    <input type="text" id="profile-name" class="form-control" placeholder="Nome do usuário">
                                </div>
                                <div class="mb-3">
                                    <label for="profile-email" class="form-label">Email</label>
                                    <input type="email" id="profile-email" class="form-control" placeholder="Email do usuário" readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-password" class="form-label">Nova Senha</label>
                                    <input type="password" id="profile-password" class="form-control" placeholder="Nova senha">
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Salvar Alterações</button>
                            </form>
                        </div>
                        <div class="modal-footer">
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

        try {
            if (profileName && profileName !== user.displayName) {
                await updateProfile(user, { displayName: profileName });
                console.log("Nome atualizado para:", profileName);
            }

            if (profilePassword) {
                if (profilePassword.length < 6) {
                    this.uiManager?.showError("A senha deve ter pelo menos 6 caracteres.");
                    return;
                }
                await updatePassword(user, profilePassword);
                console.log("Senha atualizada com sucesso.");
            }

            this.uiManager?.showSuccess("Perfil atualizado com sucesso!");
            this.modal.hide();
        } catch (error) {
            console.error("Erro ao salvar alterações do perfil:", error);
            this.uiManager?.showError("Erro ao salvar alterações do perfil. Tente novamente.");
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