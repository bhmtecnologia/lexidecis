//login.js

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { firebaseConfig } from './auth.js';
if (!getApps().length) {
  initializeApp(firebaseConfig);
}
import './auth.js';
import { showAlert } from './alertManager.js'; // Importa a função showAlert

// --- INÍCIO: Autenticação Google ---
import { getAuth, GoogleAuthProvider, signInWithPopup, OAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const googleBtn = document.getElementById('google-login-btn');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        const auth = getAuth(); // Usa a instância já inicializada
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            window.location.href = '/pages/chat.html';
        } catch (error) {
            alert('Erro ao autenticar com Google: ' + (error.message || error));
        }
    });
}
// --- INÍCIO: Autenticação Microsoft ---
const microsoftBtn = document.getElementById('microsoft-login-btn');
if (microsoftBtn) {
    microsoftBtn.addEventListener('click', async () => {
        const auth = getAuth();
        const provider = new OAuthProvider('microsoft.com');
        try {
            await signInWithPopup(auth, provider);
            window.location.href = '/pages/chat.html';
        } catch (error) {
            alert('Erro ao autenticar com Microsoft: ' + (error.message || error));
        }
    });
}
// --- FIM: Autenticação Microsoft ---

document.addEventListener("DOMContentLoaded", () => {
    verifyAuthState(); // Verifica a sessão ao carregar a página
});

/**
 * Manipula o evento de envio do formulário de login.
 */
document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        showAlert('Por favor, preencha todos os campos.', 'warning');
        return;
    }

    try {
        // Realiza o login e obtém os dados do usuário
        const user = await login(email, password);

        // Salva os dados do usuário no sessionStorage
        sessionStorage.setItem("uuid", user.uid);
        sessionStorage.setItem("email", user.email);

        // Obtém e salva o JWT no sessionStorage
        const jwt = await getJwt();
        sessionStorage.setItem("jwt", jwt);

        console.log("Login bem-sucedido:", user);
        console.log("JWT salvo no sessionStorage:", jwt);

        // Exibe um alerta de sucesso antes de redirecionar (opcional)
        showAlert('Login realizado com sucesso!', 'success');

        // Redireciona para a página protegida após curto delay, se desejar
        setTimeout(() => {
            window.location.href = "chat.html"; // URL da página protegida pós-login
        }, 0);
    } catch (error) {
        console.error("Erro ao realizar login:", error);
        showAlert(`Erro ao fazer login: ${error.message}`, 'error');
    }
});

/**
 * Manipula o clique no botão de recuperação de senha.
 */
document.getElementById('reset-password-button').addEventListener('click', async () => {
    const email = prompt("Digite o e-mail para redefinição de senha:");

    if (!email) {
        showAlert("Por favor, forneça um e-mail válido.", 'warning');
        return;
    }

    try {
        await resetPassword(email);
        showAlert("E-mail de redefinição enviado. Verifique sua caixa de entrada.", 'success');
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        showAlert(`Erro ao redefinir senha: ${error.message}`, 'error');
    }
});