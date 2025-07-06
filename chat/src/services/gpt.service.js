import { ApiBaseService } from './api.base.service.js';
import { API_CONFIG } from '../config/api.config.js';

/**
 * Serviço para gerenciamento de GPTs
 */
export class GptService extends ApiBaseService {
  constructor(authService) {
    super(authService);
  }

  /**
   * Lista todos os GPTs disponíveis
   * @returns {Promise<Array>} - Lista de GPTs
   */
  async listGpts() {
    return await this.get(API_CONFIG.ENDPOINTS.GPTS);
  }

  /**
   * Obtém a configuração de um GPT específico
   * @param {string} gptId - ID do GPT
   * @returns {Promise<Object>} - Configuração do GPT
   */
  async getGptConfig(gptId) {
    return await this.get(`${API_CONFIG.ENDPOINTS.GPT_CONFIG}/${gptId}`);
  }

  /**
   * Cria um mapa de GPTs para acesso rápido
   * @param {Array} gpts - Lista de GPTs
   * @returns {Object} - Mapa de GPTs indexado por ID
   */
  createGptMap(gpts) {
    const gptMap = {};
    
    gpts.forEach(gpt => {
      gptMap[gpt.id] = gpt;
    });
    
    return gptMap;
  }

  /**
   * Valida se um GPT existe
   * @param {string} gptId - ID do GPT
   * @param {Object} gptMap - Mapa de GPTs
   * @returns {boolean} - True se o GPT existe
   */
  validateGptExists(gptId, gptMap) {
    return gptId in gptMap;
  }

  /**
   * Obtém GPT por ID com validação
   * @param {string} gptId - ID do GPT
   * @param {Object} gptMap - Mapa de GPTs
   * @returns {Object|null} - GPT encontrado ou null
   */
  getGptById(gptId, gptMap) {
    return gptMap[gptId] || null;
  }

  /**
   * Filtra GPTs por categoria
   * @param {Array} gpts - Lista de GPTs
   * @param {string} category - Categoria para filtrar
   * @returns {Array} - GPTs filtrados
   */
  filterGptsByCategory(gpts, category) {
    return gpts.filter(gpt => gpt.category === category);
  }

  /**
   * Busca GPTs por texto
   * @param {Array} gpts - Lista de GPTs
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} - GPTs encontrados
   */
  searchGpts(gpts, searchTerm) {
    const term = searchTerm.toLowerCase();
    
    return gpts.filter(gpt => 
      gpt.name.toLowerCase().includes(term) ||
      (gpt.description && gpt.description.toLowerCase().includes(term)) ||
      (gpt.category && gpt.category.toLowerCase().includes(term))
    );
  }

  /**
   * Ordena GPTs por critério
   * @param {Array} gpts - Lista de GPTs
   * @param {string} sortBy - Critério de ordenação ('name', 'category', 'createdAt')
   * @param {string} order - Ordem ('asc' ou 'desc')
   * @returns {Array} - GPTs ordenados
   */
  sortGpts(gpts, sortBy = 'name', order = 'asc') {
    return [...gpts].sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === 'string') {
        valueB = valueB.toLowerCase();
      }
      
      if (order === 'desc') {
        return valueB > valueA ? 1 : -1;
      }
      
      return valueA > valueB ? 1 : -1;
    });
  }

  /**
   * Obtém estatísticas dos GPTs
   * @param {Array} gpts - Lista de GPTs
   * @returns {Object} - Estatísticas dos GPTs
   */
  getGptStats(gpts) {
    const stats = {
      total: gpts.length,
      categories: {},
      hasImage: 0,
      hasVideo: 0
    };

    gpts.forEach(gpt => {
      // Contagem por categoria
      if (gpt.category) {
        stats.categories[gpt.category] = (stats.categories[gpt.category] || 0) + 1;
      }

      // Contagem de mídias
      if (gpt.imageUrl) {
        if (gpt.imageUrl.toLowerCase().endsWith('.mp4')) {
          stats.hasVideo++;
        } else {
          stats.hasImage++;
        }
      }
    });

    return stats;
  }
} 