import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile, 
    updateEmail, 
    updatePassword 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

class ProfileManager {
    constructor() {
        this.modalId = "profileModal";
        this.ensureBootstrapLoaded();
        this.renderModal();
        this.addEventListeners();
    }

    /**
     * Garante que as dependências do Bootstrap sejam carregadas apenas uma vez.
     */
    ensureBootstrapLoaded() {
        const bootstrapCSSUrl = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css";
        const bootstrapIconsUrl = "https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css";
        const bootstrapJSUrl = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js";

        function isResourceLoaded(resourceUrl, tagName, attribute) {
            return Array.from(document.getElementsByTagName(tagName)).some(
                (tag) => tag[attribute] && tag[attribute].includes(resourceUrl)
            );
        }

        // Carregar CSS do Bootstrap
        if (!isResourceLoaded(bootstrapCSSUrl, "link", "href")) {
            const bootstrapCSS = document.createElement("link");
            bootstrapCSS.rel = "stylesheet";
            bootstrapCSS.href = bootstrapCSSUrl;
            document.head.appendChild(bootstrapCSS);
        }

        // Carregar Icons do Bootstrap
        if (!isResourceLoaded(bootstrapIconsUrl, "link", "href")) {
            const bootstrapIcons = document.createElement("link");
            bootstrapIcons.rel = "stylesheet";
            bootstrapIcons.href = bootstrapIconsUrl;
            document.head.appendChild(bootstrapIcons);
        }

        // Carregar JS do Bootstrap
        if (!isResourceLoaded(bootstrapJSUrl, "script", "src")) {
            const bootstrapJS = document.createElement("script");
            bootstrapJS.src = bootstrapJSUrl;
            document.body.appendChild(bootstrapJS);
        }
    }

    /**
     * Renderiza o modal no DOM.
     */
    renderModal() {
        const modalHTML = `
            <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-labelledby="profileModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="profileModalLabel">Gerenciamento de Perfil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="login-form">
                                <h6>Login</h6>
                                <div class="mb-3">
                                    <label for="login-email" class="form-label">Email</label>
                                    <input type="email" id="login-email" class="form-control" placeholder="Email" required>
                                </div>
                                <div class="mb-3">
                                    <label for="login-password" class="form-label">Senha</label>
                                    <input type="password" id="login-password" class="form-control" placeholder="Senha" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Entrar</button>
                            </form>

                            <hr>

                            <form id="update-form" style="display:none;">
                                <h6>Atualizar Perfil</h6>
                                <div class="mb-3">
                                    <label for="profile-name" class="form-label">Nome</label>
                                    <input type="text" id="profile-name" class="form-control" placeholder="Nome">
                                </div>
                                <div class="mb-3">
                                    <label for="profile-email" class="form-label">Email</label>
                                    <input type="email" id="profile-email" class="form-control" placeholder="Email" readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="profile-password" class="form-label">Senha</label>
                                    <input type="password" id="profile-password" class="form-control" placeholder="Nova senha">
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Salvar</button>
                                <button id="logout-btn" class="btn btn-danger w-100 mt-2">Sair</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("modal-container").innerHTML = modalHTML;
    }

    /**
     * Adiciona eventos ao modal.
     */
    addEventListeners() {
        const loginForm = document.getElementById("login-form");
        const updateForm = document.getElementById("update-form");
        const logoutBtn = document.getElementById("logout-btn");

        // Abrir o modal ao clicar no botão
        document.getElementById("profile-icon").addEventListener("click", () => {
            const modal = new bootstrap.Modal(document.getElementById(this.modalId));
            modal.show();
        });

        // Login
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                document.getElementById("profile-name").value = user.displayName || "";
                document.getElementById("profile-email").value = user.email;

                loginForm.style.display = "none";
                updateForm.style.display = "block";

                alert("Login bem-sucedido!");
            } catch (error) {
                alert("Erro ao fazer login: " + error.message);
            }
        });

        // Atualizar Perfil
        updateForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("profile-name").value;
            const password = document.getElementById("profile-password").value;

            const user = auth.currentUser;
            try {
                if (name) await updateProfile(user, { displayName: name });
                if (password) await updatePassword(user, password);

                alert("Perfil atualizado com sucesso!");
            } catch (error) {
                alert("Erro ao atualizar perfil: " + error.message);
            }
        });

        // Logout
        logoutBtn.addEventListener("click", async () => {
            try {
                await signOut(auth);
                loginForm.style.display = "block";
                updateForm.style.display = "none";
                alert("Você saiu da sua conta.");
            } catch (error) {
                alert("Erro ao deslogar: " + error.message);
            }
        });
    }
}

// Inicializar o ProfileManager
new ProfileManager();