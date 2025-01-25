//login.js

import { login, resetPassword, verifyAuthState, getJwt } from './auth.js'; // Importa funções do auth.js
import { showAlert } from './alertManager.js'; // Importa a função showAlert

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