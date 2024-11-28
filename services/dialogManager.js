// Certifique-se de exportar as funções corretamente
export async function renameChatDialog(oldChatName) {
    const { value: newChatName } = await Swal.fire({
        title: 'Renomear Chat',
        input: 'text',
        inputLabel: 'Novo nome para o chat:',
        inputValue: oldChatName,
        showCancelButton: true,
        confirmButtonText: 'Renomear',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'O nome do chat não pode estar vazio.';
            }
            if (value.trim() === oldChatName.trim()) {
                return 'Insira um nome diferente do atual.';
            }
        },
    });

    return newChatName ? newChatName.trim() : null;
}

export async function confirmDeleteDialog(chatName) {
    const { isConfirmed } = await Swal.fire({
        title: `Excluir o chat "${chatName}"?`,
        text: 'Esta ação não poderá ser desfeita.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
    });

    return isConfirmed;
}