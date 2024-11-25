// auth.js
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

// Configurações de inatividade
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos
let inactivityTimeout;

/**
 * Realiza o login do usuário.
 */
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Erro ao realizar login:", error);
        throw new Error(error.message);
    }
}

/**
 * Realiza o logout do usuário autenticado.
 */
export async function logout() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        console.log("Usuário deslogado com sucesso.");
    } catch (error) {
        console.error("Erro ao realizar logout:", error);
        throw new Error(error.message);
    }
}

/**
 * Envia um e-mail de redefinição de senha para o usuário.
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log("E-mail de redefinição de senha enviado.");
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        throw new Error(error.message);
    }
}

/**
 * Atualiza o perfil do usuário autenticado.
 */
export async function updateUserProfile({ username, newPassword }) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Usuário não autenticado.");
    }

    if (username) {
        await updateProfile(user, { displayName: username });
    }

    if (newPassword) {
        if (newPassword.length < 6) {
            throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
        }
        await updatePassword(user, newPassword);
    }
}

/**
 * Reautentica o usuário com a senha atual.
 */
export async function reauthenticateUser(currentPassword) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Usuário não autenticado.");
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
}

/**
 * Reinicia o temporizador de inatividade.
 */
export function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(async () => {
        await logout();
        alert("Você foi desconectado por inatividade.");
        window.location.href = "index.html";
    }, INACTIVITY_LIMIT);
}

/**
 * Configura monitoramento de inatividade do usuário.
 */
export function monitorInactivity() {
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
    const tenant = sessionStorage.getItem("tenant");
    const email = sessionStorage.getItem("email");
    const uuid = sessionStorage.getItem("uuid");

    if (!tenant || !email || !uuid) {
        alert("Sessão expirada ou inválida. Faça login novamente.");
        window.location.href = "index.html";
    } else {
        console.log("Sessão válida:", { tenant, email, uuid });
        monitorInactivity();
    }
}