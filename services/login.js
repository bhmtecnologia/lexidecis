import { login, resetPassword, verifyAuthState, getJwt } from './auth.js'; // Importa funções do auth.js

document.addEventListener("DOMContentLoaded", () => {
    verifyAuthState(); // Verifica a sessão ao carregar a página
});

/**
 * Manipula o evento de envio do formulário de login.
 */
document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const tenant = document.getElementById("tenant").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (tenant !== "bhm") {
        alert("Tenant inválido. Use 'bhm' como tenant.");
        return;
    }

    try {
        // Realiza o login e obtém os dados do usuário
        const user = await login(email, password);

        // Salva os dados do usuário no sessionStorage
        sessionStorage.setItem("tenant", tenant);
        sessionStorage.setItem("uuid", user.uid);
        sessionStorage.setItem("email", user.email);

        // Obtém e salva o JWT no sessionStorage
        const jwt = await getJwt();
        sessionStorage.setItem("jwt", jwt);

        console.log("Login bem-sucedido:", user);
        console.log("JWT salvo no sessionStorage:", jwt);

        // Redireciona para a página protegida
        window.location.href = "../pages/chat.html"; /* URL DO CHAT PROTEGIDA APÓS LOGIN */
    } catch (error) {
        console.error("Erro ao realizar login:", error);
        alert(`Erro ao fazer login: ${error.message}`);
    }
});

/**
 * Manipula o clique no botão de recuperação de senha.
 */
document.getElementById('reset-password-button').addEventListener('click', async () => {
    const email = prompt("Digite o e-mail para redefinição de senha:");

    if (!email) {
        alert("Por favor, forneça um e-mail válido.");
        return;
    }

    try {
        await resetPassword(email);
        alert("E-mail de redefinição enviado. Verifique sua caixa de entrada.");
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        alert(`Erro ao redefinir senha: ${error.message}`);
    }
});