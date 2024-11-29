// alertManager.js

/**
 * Carrega dinamicamente a biblioteca SweetAlert2 via CDN.
 * Se a biblioteca já estiver carregada, a função resolve imediatamente.
 *
 * @function
 * @returns {Promise<void>} Uma promessa que será resolvida quando a biblioteca for carregada com sucesso.
 * @throws {Error} Se ocorrer uma falha ao carregar o script da biblioteca.
 */
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

/**
 * Exibe um prompt para o usuário renomear um chat.
 * O prompt inclui validação para impedir que o nome seja vazio.
 *
 * @async
 * @function
 * @param {string} oldName - O nome atual do chat que será sugerido como valor padrão no input.
 * @returns {Promise<string|null>} Uma promessa que resolve com o novo nome fornecido pelo usuário,
 * ou `null` caso o prompt seja cancelado.
 */
export async function showRenamePrompt(oldName) {
    await loadSweetAlert();
    return Swal.fire({
        title: 'Renomear Chat',
        input: 'text',
        icon: 'question',
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

/**
 * Exibe um alerta Toast no canto superior direito da tela.
 * O Toast é exibido por um tempo limitado e desaparece automaticamente.
 *
 * @async
 * @function
 * @param {string} message - A mensagem a ser exibida no Toast.
 * @param {string} [type='success'] - O tipo de ícone exibido no Toast. Valores possíveis:
 * `success`, `error`, `warning`, `info`, ou `question`.
 * @returns {Promise<void>} Uma promessa que resolve quando o Toast é exibido.
 */
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

/**
 * Exibe um modal de confirmação para exclusão de um chat.
 * O modal alerta que a ação não pode ser desfeita e solicita confirmação explícita.
 *
 * @async
 * @function
 * @param {string} chatName - O nome do chat a ser exibido no modal de confirmação.
 * @returns {Promise<boolean>} Uma promessa que resolve com `true` se o usuário confirmar a exclusão,
 * ou `false` se o usuário cancelar.
 */

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
