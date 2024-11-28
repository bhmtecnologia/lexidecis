// alertManager.js

// Função para carregar dinamicamente o SweetAlert2 via CDN
export function loadSweetAlert() {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[src="https://cdn.jsdelivr.net/npm/sweetalert2@11"]')) {
            resolve(); // SweetAlert2 já está carregado
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar SweetAlert2.'));
        document.head.appendChild(script);
    });
}

// Função para exibir o prompt de renomeação
export async function showRenamePrompt(oldName) {
    await loadSweetAlert();
    return Swal.fire({
        title: 'Renomear Chat',
        input: 'text',
        inputLabel: `Renomear "${oldName}" para:`,
        inputValue: oldName,
        showCancelButton: true,
        confirmButtonText: 'Renomear',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value.trim()) {
                return 'O nome não pode ser vazio.';
            }
            return null;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            return result.value.trim(); // Retorna o novo nome se confirmado
        }
        return null; // Retorna null se cancelado
    });
}

// Função para exibir alertas do tipo Toast
export async function showAlert(message, type = 'success') {
    await loadSweetAlert();
    Swal.fire({
        icon: type,
        title: message,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
    });
}

// Função para exibir um modal de confirmação
export async function showDeleteConfirmation(chatName) {
    await loadSweetAlert();
    return Swal.fire({
        title: `Excluir Chat "${chatName}"?`,
        text: 'Essa ação não pode ser desfeita.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6'
    }).then((result) => {
        return result.isConfirmed; // Retorna true se confirmado, false se cancelado
    });
}