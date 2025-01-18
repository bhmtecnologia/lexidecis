// Firebase Auth e Analytics Service
const DEBUG_MODE = false; // Alterar para true para habilitar os logs de debug

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

import { showAlert } from './alertManager.js'; // Importe a função showAlert
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail, 
    updatePassword, 
    updateProfile, 
    onAuthStateChanged, 
    EmailAuthProvider, 
    reauthenticateWithCredential 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { 
    getAnalytics, 
    logEvent 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";

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
const analytics = getAnalytics(app); // Inicializa o Firebase Analytics

// Limite de inatividade (em milissegundos)
const INACTIVITY_LIMIT = 10 * 60 * 1000000000; // 10 minutos
let inactivityTimeout;

/**
 * Realiza o login do usuário.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 */
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        debugLog("[Login] Usuário logado com sucesso:", {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
        });

        // Loga o evento de login no Firebase Analytics
        logEvent(analytics, 'login', { method: 'email_password' });

        // Configura monitoramento de inatividade após login
        monitorInactivity();

        return userCredential.user;
    } catch (error) {
        console.error("[Login] Erro ao realizar login:", error);
        showAlert('Credenciais inválidas. Verifique seu email e senha.', 'error');
        throw new Error(error.message);
    }
}

/**
 * Obtém o JWT do usuário autenticado.
 * @returns {Promise<string>} Retorna o token JWT.
 */
export async function getJwt() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("[JWT] Usuário não autenticado. Faça login para obter o token.");
    }

    try {
        const token = await user.getIdToken(true);
        debugLog("[JWT] Token obtido com sucesso:", token);
        return token;
    } catch (error) {
        console.error("[JWT] Erro ao obter o token:", error);
        throw new Error("Erro ao obter o token JWT.");
    }
}

/**
 * Realiza o logout do usuário autenticado.
 */
export async function logout() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        debugLog("[Logout] Usuário deslogado com sucesso.");

        // Loga o evento de logout no Firebase Analytics
        logEvent(analytics, 'logout');

        window.location.href = "../index.html"; // Garante o redirecionamento para a página de login
    } catch (error) {
        console.error("[Logout] Erro ao realizar logout:", error);
        throw new Error(error.message);
    }
}

/**
 * Envia um e-mail de redefinição de senha para o usuário.
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        debugLog("[ResetPassword] E-mail de redefinição de senha enviado.");

        // Loga o evento de redefinição de senha no Firebase Analytics
        logEvent(analytics, 'password_reset', { email });
    } catch (error) {
        console.error("[ResetPassword] Erro ao enviar e-mail de redefinição:", error);
        throw new Error(error.message);
    }
}

/**
 * Atualiza o perfil do usuário autenticado.
 */
export async function updateUserProfile({ username, newPassword }) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("[UpdateProfile] Usuário não autenticado.");
    }

    if (username) {
        await updateProfile(user, { displayName: username });
        debugLog("[UpdateProfile] Nome de usuário atualizado para:", username);

        // Loga o evento de atualização de perfil no Firebase Analytics
        logEvent(analytics, 'update_profile', { displayName: username });
    }

    if (newPassword) {
        if (newPassword.length < 6) {
            throw new Error("[UpdateProfile] A nova senha deve ter pelo menos 6 caracteres.");
        }
        await updatePassword(user, newPassword);
        debugLog("[UpdateProfile] Senha atualizada com sucesso.");

        // Loga o evento de alteração de senha no Firebase Analytics
        logEvent(analytics, 'password_change');
    }
}

/**
 * Reautentica o usuário com a senha atual.
 */
export async function reauthenticateUser(currentPassword) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("[Reauthenticate] Usuário não autenticado.");
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    debugLog("[Reauthenticate] Usuário reautenticado com sucesso.");

    // Loga o evento de reautenticação no Firebase Analytics
    logEvent(analytics, 'reauthenticate');
}

/**
 * Reinicia o temporizador de inatividade.
 */
export function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    debugLog(`[Inatividade] Temporizador reiniciado. O limite é de ${INACTIVITY_LIMIT / 1000} segundos.`);

    inactivityTimeout = setTimeout(async () => {
        debugLog("[Inatividade] Limite de inatividade atingido. Desconectando o usuário...");
        logEvent(analytics, 'session_timeout'); // Loga o evento de timeout
        await logout(); // Executa logout e redireciona
    }, INACTIVITY_LIMIT);
}

/**
 * Configura monitoramento de inatividade do usuário.
 */
export function monitorInactivity() {
    debugLog("[Inatividade] Monitoramento de inatividade iniciado.");
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    window.addEventListener("scroll", resetInactivityTimer);
    window.addEventListener("click", resetInactivityTimer);
    window.addEventListener("touchstart", resetInactivityTimer);

    resetInactivityTimer();
}

/**
 * Verifica o estado de autenticação e redireciona se necessário.
 */
export function verifyAuthState() {
    const currentPage = window.location.pathname.split("/").pop();

    // Lista de páginas públicas que não exigem autenticação
    const publicPages = ["index.html", "login.html"];

    if (publicPages.includes(currentPage)) {
        debugLog("[AuthState] Página pública acessada. Verificação de autenticação ignorada.");
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            debugLog("[AuthState] Usuário autenticado:", {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
            });

            logEvent(analytics, 'auth_state_change', { loggedIn: true }); // Loga o evento

            // Configura monitoramento de inatividade
            monitorInactivity();
        } else {
            alert("Sua sessão expirou. Por favor, faça login novamente.");
            sessionStorage.clear(); // Limpa dados locais
            logEvent(analytics, 'auth_state_change', { loggedIn: false }); // Loga o evento
            window.location.href = "../index.html"; // Redireciona para login
        }
    });
}

// Torna funções acessíveis no console para depuração
window.monitorInactivity = monitorInactivity;
window.resetInactivityTimer = resetInactivityTimer;
window.verifyAuthState = verifyAuthState;