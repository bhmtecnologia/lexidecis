// alerts.js

/**
 * Carrega dinamicamente a biblioteca SweetAlert2 via CDN.
 * Se a biblioteca já estiver carregada, a função resolve imediatamente.
 *
 * @returns {Promise<void>} Uma promessa que será resolvida quando a biblioteca for carregada com sucesso.
 * @throws {Error} Se ocorrer uma falha ao carregar o script da biblioteca.
 */
export const loadSweetAlert = () => {
    return new Promise((resolve, reject) => {
      // Verifica se o SweetAlert2 já foi carregado
      if (document.querySelector('script[src="https://cdn.jsdelivr.net/npm/sweetalert2@11"]')) {
        resolve(); // Já está disponível
        return;
      }
  
      // Cria a tag de script e define a fonte para carregar a biblioteca via CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar SweetAlert2 via CDN.'));
      document.head.appendChild(script);
    });
  };
  
  /**
   * Exibe um prompt para renomear um chat.
   * Inclui validação para assegurar que o novo nome não seja vazio.
   *
   * @param {string} oldName - O nome atual do chat, usado como valor padrão.
   * @returns {Promise<string|null>} Uma promessa que resolve com o novo nome fornecido ou null se cancelado.
   */
  export const showRenamePrompt = async (oldName) => {
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
    }).then(result => result.isConfirmed ? result.value.trim() : null);
  };
  
  /**
   * Exibe um alerta Toast no canto superior direito utilizando SweetAlert2.
   * O Toast desaparece automaticamente após um intervalo.
   *
   * @param {string} message - A mensagem a ser exibida.
   * @param {string} [type='success'] - O tipo de alerta: 'success', 'error', 'warning', 'info' ou 'question'.
   * @returns {Promise<void>}
   */
  export const showAlert = async (message, type = 'success') => {
    await loadSweetAlert();
    Swal.fire({
      icon: type,
      title: message,
      toast: true,
      position: 'top-end',
      timer: 6000,
      timerProgressBar: true,
      showConfirmButton: false,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
  };
  
  /**
   * Exibe um modal de confirmação para exclusão de um chat.
   * Solicita confirmação explícita e alerta que a ação não pode ser revertida.
   *
   * @param {string} chatName - O nome do chat a ser excluído.
   * @returns {Promise<boolean>} Retorna true se confirmado; caso contrário, false.
   */
  export const showDeleteConfirmation = async (chatName) => {
    await loadSweetAlert();
    return Swal.fire({
      title: `Excluir Chat "${chatName}"?`,
      text: 'Esta ação não pode ser desfeita. Tem certeza que deseja continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then(result => result.isConfirmed);
  };