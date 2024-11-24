// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    signOut,
    updatePassword,
    sendPasswordResetEmail,
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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configura a persistência de sessão local
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("Persistência configurada para 'local'.");
    })
    .catch((error) => {
        console.error("Erro ao configurar persistência:", error);
    });

// Função para login
window.login = async function () {
    const tenant = document.getElementById("tenant").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Validação temporária do tenant
    if (tenant !== "bhm") {
        alert("Tenant inválido. Use 'bhm' como tenant.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Armazenar no sessionStorage as informações de login
        sessionStorage.setItem("tenant", tenant);
        sessionStorage.setItem("uuid", user.uid);
        sessionStorage.setItem("email", email);

        // Redirecionar para outra página, ex: chat.html
        window.location.href = "chat.html";
    } catch (error) {
        alert(`Erro no login: ${error.message}`);
    }
};

// Logout por inatividade
const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos
let inactivityTimeout;

// Função para deslogar o usuário após inatividade
window.logout = async function () {
    try {
        await signOut(auth);
        sessionStorage.clear();
        alert("login.js: Você foi desconectado devido à inatividade.");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    }
};

// Função para reiniciar o temporizador de inatividade
const resetInactivityTimer = () => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(window.logout, INACTIVITY_LIMIT);
};

// Monitorando a atividade do usuário
const monitorInactivity = () => {
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    window.addEventListener("scroll", resetInactivityTimer);
    window.addEventListener("click", resetInactivityTimer);
    window.addEventListener("touchstart", resetInactivityTimer);
    resetInactivityTimer();
};

// Monitorar o estado de autenticação
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuário autenticado:", user.uid);
        monitorInactivity();
    } else {
        console.log("Usuário não autenticado.");
        sessionStorage.clear();

        // **Ação Condicional de Redirecionamento**
        // Verifique se a página atual NÃO é a página de login antes de redirecionar
        const currentPage = window.location.pathname.split("/").pop();
        const loginPages = ["index.html", "logins.html"]; // Adicione o nome correto da sua página de login

        if (!loginPages.includes(currentPage)) {
            window.location.href = "index.html";
        }
    }
});

// Função para alterar senha do usuário logado
window.changePassword = async function () {
    const user = auth.currentUser;

    if (!user) {
        alert("Usuário não autenticado.");
        return;
    }

    const newPassword = prompt("Digite sua nova senha:");
    if (!newPassword || newPassword.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    try {
        await updatePassword(user, newPassword);
        alert("Senha alterada com sucesso!");
    } catch (error) {
        console.error("Erro ao alterar a senha:", error);
        alert(`Erro ao alterar a senha: ${error.message}`);
    }
};

// Função para recuperação de senha (usuário deslogado)
window.resetPassword = async function () {
    const email = prompt("Digite o e-mail cadastrado:");

    if (!email) {
        alert("E-mail é obrigatório.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert("Um e-mail para redefinir sua senha foi enviado.");
    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição de senha:", error);
        alert(`Erro ao redefinir senha: ${error.message}`);
    }
};