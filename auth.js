// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Função para deslogar o usuário manualmente (exemplo: botão de sair)
window.logout = async function () {
    try {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = "index.html"; // Redireciona para o login
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    }
};

// Função para deslogar o usuário após inatividade
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos
let inactivityTimeout;

async function logoutDueToInactivity() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        alert("Você foi desconectado devido à inatividade.");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    }
}

// Função para reiniciar o temporizador de inatividade
const resetInactivityTimer = () => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(logoutDueToInactivity, INACTIVITY_LIMIT);
};

// Monitorando a atividade do usuário
function monitorInactivity() {
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    window.addEventListener("scroll", resetInactivityTimer);
    window.addEventListener("click", resetInactivityTimer);
    window.addEventListener("touchstart", resetInactivityTimer);
    resetInactivityTimer();
}

// Verifica se o usuário está autenticado
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Se o usuário não estiver autenticado, redireciona para a página de login
        alert("Você precisa estar logado para acessar o chat.");
        window.location.href = "index.html"; // Redireciona para o login
    } else {
        // Se o usuário estiver autenticado, continue com a inicialização da página
        console.log("Usuário autenticado: ", user.uid);
        monitorInactivity();
    }
});