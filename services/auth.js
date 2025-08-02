//auth.js
// Firebase Auth, Analytics e Firestore Service
const DEBUG_MODE = false; // Defina como true para habilitar os logs de debug durante a depuração

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

import { showAlert } from './alertManager.js'; // Importe a função showAlert
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getAnalytics, 
    logEvent 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
// **Importações para o Firestore**
import { 
    getFirestore, 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração do Firebase
export const firebaseConfig = {
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
export const auth = getAuth(app);
export const analytics = getAnalytics(app); // Inicializa o Firebase Analytics
export const db = getFirestore(app); // **Inicializa o Firestore**

/**
 * Salva os dados da sessão do usuário no Firestore.
 * @param {object} user - Objeto do usuário autenticado.
 */
async function saveUserSession(user) {
    if (!user) return;

    const userDoc = doc(db, "userSessions", user.uid); // Referência ao documento no Firestore
    try {
        await setDoc(userDoc, {
            email: user.email,
            displayName: user.displayName || "Usuário Anônimo",
            lastLogin: serverTimestamp(), // Marca a última vez que o usuário fez login
            online: true, // Marca o usuário como online
            lastSeen: serverTimestamp() // Última atividade
        }, { merge: true }); // **merge: true** para atualizar sem sobrescrever outros campos

        debugLog("[Firestore] Sessão salva com sucesso para o usuário:", user.uid);
    } catch (error) {
        console.error("[Firestore] Erro ao salvar a sessão:", error);
        showAlert('Erro ao salvar dados da sessão. Tente novamente.', 'error'); // Notificação ao usuário
    }
}

// Limite de inatividade (em segundos)
const INACTIVITY_LIMIT = 4 * 60 * 60 * 1000; // **4 horas**
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

        // **Salva a sessão no Firestore após o login**
        await saveUserSession(userCredential.user);

        // Configura monitoramento de inatividade após login
        monitorInactivity();

        // Configura listener para marcar usuário como offline quando a página for fechada
        window.addEventListener('beforeunload', async () => {
            if (userCredential.user) {
                await markUserOffline(userCredential.user.uid);
            }
        });

        return userCredential.user;
    } catch (error) {
        console.error("[Login] Erro ao realizar login:", error);
        showAlert('Credenciais inválidas ou erro no servidor. Tente novamente.', 'error');
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
 * Marca o usuário como offline no Firestore
 */
async function markUserOffline(uid) {
    if (!uid) return;
    
    try {
        const userDoc = doc(db, "userSessions", uid);
        await setDoc(userDoc, {
            online: false,
            lastSeen: serverTimestamp()
        }, { merge: true });
        debugLog("[Firestore] Usuário marcado como offline:", uid);
    } catch (error) {
        console.error("[Firestore] Erro ao marcar usuário como offline:", error);
    }
}

/**
 * Realiza o logout do usuário autenticado.
 */
export async function logout() {
    try {
        const user = auth.currentUser; // Salva a referência ao usuário antes de deslogar
        
        // Marca o usuário como offline antes de deslogar
        if (user) {
            await markUserOffline(user.uid);
        }
        
        await signOut(auth);
        sessionStorage.clear();
        debugLog("[Logout] Usuário deslogado com sucesso.");

        // Loga o evento de logout no Firebase Analytics
        logEvent(analytics, 'logout');

        // **Atualiza a sessão no Firestore antes de deslogar**
        if (user) {
            const userDoc = doc(db, "userSessions", user.uid);
            await setDoc(userDoc, {
                lastLogout: serverTimestamp(),
            }, { merge: true });
            debugLog("[Firestore] Sessão atualizada com logout para o usuário:", user.uid);
        }

        window.location.href = "../index.html"; // Garante o redirecionamento para a página de login
    } catch (error) {
        console.error("[Logout] Erro ao realizar logout:", error);
        showAlert('Erro ao deslogar. Tente novamente.', 'error'); // Notificação ao usuário
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
        showAlert('Erro ao enviar e-mail de redefinição. Tente novamente.', 'error'); // Notificação ao usuário
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

    try {
        if (username) {
            await updateProfile(user, { displayName: username });
            debugLog("[UpdateProfile] Nome de usuário atualizado para:", username);

            // Loga o evento de atualização de perfil no Firebase Analytics
            logEvent(analytics, 'update_profile', { displayName: username });

            // **Atualiza a sessão no Firestore com o novo displayName**
            await saveUserSession(user);
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
    } catch (error) {
        console.error("[UpdateProfile] Erro ao atualizar o perfil:", error);
        showAlert('Erro ao atualizar o perfil. Tente novamente.', 'error'); // Notificação ao usuário
        throw new Error(error.message);
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

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        debugLog("[Reauthenticate] Usuário reautenticado com sucesso.");

        // Loga o evento de reautenticação no Firebase Analytics
        logEvent(analytics, 'reauthenticate');
    } catch (error) {
        console.error("[Reauthenticate] Erro ao reautenticar:", error);
        showAlert('Erro ao reautenticar. Verifique sua senha e tente novamente.', 'error'); // Notificação ao usuário
        throw new Error(error.message);
    }
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

    onAuthStateChanged(auth, (user) => {
        if (user) {
            debugLog("[AuthState] Usuário autenticado:", {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
            });

            logEvent(analytics, 'auth_state_change', { loggedIn: true }); // Loga o evento

            // **Salva ou atualiza a sessão no Firestore quando o estado de autenticação muda**
            saveUserSession(user);

            // Configura monitoramento de inatividade
            monitorInactivity();

            if (publicPages.includes(currentPage)) {
                // Se o usuário está na página de login ou index e já está autenticado, redireciona para chat.html
                window.location.href = "chat.html"; // Redireciona para a página de chat
                debugLog("[AuthState] Usuário já está autenticado. Redirecionando para chat.html.");
            }
        } else {
            if (!publicPages.includes(currentPage)) {
                alert("Sua sessão expirou. Por favor, faça login novamente.");
                sessionStorage.clear(); // Limpa dados locais
                logEvent(analytics, 'auth_state_change', { loggedIn: false }); // Loga o evento
                window.location.href = "../index.html"; // Redireciona para login
            } else {
                debugLog("[AuthState] Página pública acessada. Usuário não autenticado.");
            }
        }
    });
}

// Torna funções acessíveis no console para depuração
window.monitorInactivity = monitorInactivity;
window.resetInactivityTimer = resetInactivityTimer;
window.verifyAuthState = verifyAuthState;