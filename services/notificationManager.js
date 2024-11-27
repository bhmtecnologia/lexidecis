export function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
        console.error('Container de toast não encontrado.');
        alert(message); // Fallback para alert padrão
        return;
    }

    // Mapear ícones para tipos de mensagens
    const icons = {
        success: 'bi-check-circle-fill', // Ícone de sucesso
        danger: 'bi-exclamation-triangle-fill', // Ícone de erro
        warning: 'bi-exclamation-circle-fill', // Ícone de alerta
        info: 'bi-info-circle-fill', // Ícone de informação
    };

    const iconClass = icons[type] || 'bi-info-circle-fill'; // Default para info

    // Gerar um ID único para o toast
    const toastId = `toast-${Date.now()}`;

    // Criar o HTML do toast com ícone
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center">
                    <i class="bi ${iconClass} me-2"></i> <!-- Ícone aqui -->
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
            </div>
        </div>
    `;

    // Adicionar o toast ao contêiner
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    // Inicializar o toast com o Bootstrap
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);

    // Mostrar o toast
    toast.show();

    // Remover o toast automaticamente após ele ser escondido
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

