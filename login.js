// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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
        // Tenta realizar o login com email e senha
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Armazenar no sessionStorage as informações de login
        sessionStorage.setItem("tenant", tenant);
        sessionStorage.setItem("uuid", user.uid);
        sessionStorage.setItem("email", email);

        // Notificar sucesso no login
        alert("Login bem-sucedido!");

        // Redirecionar para outra página, ex: chat.html
        window.location.href = "chat.html";
    } catch (error) {
        // Exibir mensagem de erro em caso de falha no login
        alert(`Erro no login: ${error.message}`);
    }
};

// Logout por Inatividade
//const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos em milissegundos
const INACTIVITY_LIMIT = 1 * 60 * 1000; // 15 minutos em milissegundos
let inactivityTimeout;

// Função para deslogar o usuário após inatividade
const logout = async () => {
    try {
        await signOut(auth); // Desloga o usuário
        sessionStorage.clear(); // Limpa o sessionStorage
        alert("Você foi desconectado devido à inatividade.");
        window.location.href = "login.html"; // Redireciona para a página de login
    } catch (error) {
        console.error("Erro ao deslogar:", error);
    }
};

// Função para reiniciar o temporizador de inatividade
const resetInactivityTimer = () => {
    clearTimeout(inactivityTimeout); // Limpa o temporizador atual
    inactivityTimeout = setTimeout(logout, INACTIVITY_LIMIT); // Reinicia o temporizador
};

// Monitorando a atividade do usuário
const monitorInactivity = () => {
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer);

    // Inicializa o temporizador logo após a carga da página
    resetInactivityTimer();
};

// Monitorar o estado de autenticação para garantir que o usuário permaneça autenticado entre as sessões
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuário autenticado:", user.uid);
    } else {
        console.log("Usuário não autenticado.");
    }
});

// Chama o monitoramento de inatividade assim que o script for carregado
monitorInactivity();