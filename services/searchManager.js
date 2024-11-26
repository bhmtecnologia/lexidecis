// SearchManager.js
export default class SearchManager {
    /**
     * Filtra uma lista de itens com base em um termo de pesquisa.
     * @param {Array} items - Lista de itens para filtrar.
     * @param {String} searchTerm - Termo de pesquisa.
     * @param {Function} getItemText - Função para extrair o texto de cada item.
     * @returns {Array} Lista filtrada.
     */
    static filterItems(items, searchTerm, getItemText) {
        if (!searchTerm) return items;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return items.filter(item => {
            const text = getItemText(item) || '';
            return text.toLowerCase().includes(lowerCaseSearchTerm);
        });
    }

    /**
     * Realça um termo de pesquisa em um texto.
     * @param {String} text - Texto no qual o termo será destacado.
     * @param {String} searchTerm - Termo de pesquisa a ser destacado.
     * @returns {String} Texto com o termo destacado.
     */
    static highlightSearch(text, searchTerm) {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${SearchManager.escapeRegExp(searchTerm)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    /**
     * Remove caracteres especiais para evitar falhas em expressões regulares.
     * @param {String} string - String a ser tratada.
     * @returns {String} String tratada.
     */
    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Limpa o campo de busca e restaura a lista original.
     * @param {HTMLElement} searchInput - Input de busca.
     * @param {HTMLElement} clearButton - Botão para limpar a busca.
     * @param {Function} restoreItems - Função para restaurar a lista original.
     */
    static clearSearch(searchInput, clearButton, restoreItems) {
        if (searchInput) searchInput.value = '';
        if (clearButton) clearButton.classList.remove('d-block');
        restoreItems();
        if (searchInput) searchInput.focus();
    }
}