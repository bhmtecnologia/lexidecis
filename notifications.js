//notifications.js
export default function adicionarNotificacao(titulo, mensagem) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error('Contêiner de notificações não encontrado.');
        return;
    }

    // Criar a notificação
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = `
        <i class="fas fa-bell"></i>
        <div>
            <strong>${titulo}</strong>
            <p>${mensagem}</p>
        </div>
    `;

    // Adicionar a notificação ao DOM
    container.appendChild(notification);
    console.log('Notificação adicionada ao DOM:', notification);

    // Remover a notificação após 5 segundos
    setTimeout(() => {
        console.log('Removendo notificação:', notification);
        notification.remove();
    }, 5000);
}