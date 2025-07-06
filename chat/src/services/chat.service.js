import { ApiBaseService } from './api.base.service.js';
import { API_CONFIG } from '../config/api.config.js';

/**
 * Serviço para gerenciamento de chats
 */
export class ChatService extends ApiBaseService {
  constructor(authService) {
    super(authService);
  }

  /**
   * Lista todos os chats do usuário
   * @returns {Promise<Array>} - Lista de chats
   */
  async listChats() {
    const response = await this.get(API_CONFIG.ENDPOINTS.CHATS);
    return this.normalizeChatResponse(response);
  }

  /**
   * Normaliza a resposta da API de chats
   * @param {any} response - Resposta da API
   * @returns {Array} - Lista normalizada de chats
   */
  normalizeChatResponse(response) {
    let resp = response;
    
    if (typeof resp === 'string') {
      resp = JSON.parse(resp);
    }
    
    const items = Array.isArray(resp) ? resp : resp.data ? [resp] : [];
    
    return items.flatMap(item => {
      const raw = item.data;
      return Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [raw];
    });
  }

  /**
   * Busca o histórico de mensagens de um chat
   * @param {string} sessionId - ID da sessão
   * @param {string} chatflowId - ID do chatflow
   * @param {string} apiHost - Host da API
   * @param {string} token - Token de autenticação
   * @returns {Promise<Array>} - Histórico de mensagens
   */
  async fetchChatHistory(sessionId, chatflowId, apiHost, token) {
    const user = this.authService.user;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const apiURL = `${apiHost}/api/v1/chatmessage/${chatflowId}?sessionId=${sessionId}`;
    console.debug('Buscando histórico em:', apiURL);

    try {
      const response = await fetch(apiURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const responseBody = await response.text();
      console.debug('Status:', response.status, 'Resposta:', responseBody);

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico de mensagens');
      }

      const apiHistory = JSON.parse(responseBody);
      return this.normalizeHistoryMessages(apiHistory);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      throw new Error('Erro ao buscar histórico de mensagens da API.');
    }
  }

  /**
   * Normaliza mensagens do histórico
   * @param {Array} messages - Mensagens da API
   * @returns {Array} - Mensagens normalizadas
   */
  normalizeHistoryMessages(messages) {
    return messages.map(msg => ({
      message: msg.content,
      type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
      dateTime: msg.createdDate || new Date().toISOString(),
      messageId: msg.id || Math.random().toString(36).substring(2),
      fileUploads: msg.fileUploads || []
    }));
  }

  /**
   * Injeta histórico no localStorage
   * @param {string} chatflowId - ID do chatflow
   * @param {string} sessionId - ID da sessão
   * @param {Array} history - Histórico de mensagens
   */
  injectChatHistory(chatflowId, sessionId, history) {
    const keyExternal = `${chatflowId}_EXTERNAL`;
    const keyInjected = `${chatflowId}_historyInjected`;
    const chatData = { chatHistory: history, chatId: sessionId };
    
    localStorage.setItem(keyExternal, JSON.stringify(chatData));
    localStorage.setItem(keyInjected, 'true');
  }

  /**
   * Cria uma nova mensagem de chat
   * @param {string} chatflowId - ID do chatflow
   * @param {string} sessionId - ID da sessão
   * @param {string} role - Papel da mensagem (user/assistant)
   * @param {string} content - Conteúdo da mensagem
   * @returns {Promise<Object>} - Resposta da API
   */
  async createChatMessage(chatflowId, sessionId, role, content) {
    const payload = {
      chatflowId,
      sessionId,
      role,
      content
    };

    return await this.post(API_CONFIG.ENDPOINTS.CHAT_MESSAGE, payload);
  }

  /**
   * Obtém estatísticas dos chats
   * @param {Array} chats - Lista de chats
   * @returns {Object} - Estatísticas dos chats
   */
  getChatStats(chats) {
    const stats = {
      total: chats.length,
      byGpt: {},
      recent: 0,
      today: 0
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 dias

    chats.forEach(chat => {
      // Contagem por GPT
      const gptKey = chat.fk_gpt_id || chat.gpt_id || chat.gptId || 'unknown';
      stats.byGpt[gptKey] = (stats.byGpt[gptKey] || 0) + 1;

      // Contagem por data
      if (chat.createdAt) {
        const chatDate = new Date(chat.createdAt);
        if (chatDate >= today) {
          stats.today++;
        }
        if (chatDate >= recent) {
          stats.recent++;
        }
      }
    });

    return stats;
  }

  /**
   * Filtra chats por GPT
   * @param {Array} chats - Lista de chats
   * @param {string} gptId - ID do GPT
   * @returns {Array} - Chats filtrados
   */
  filterChatsByGpt(chats, gptId) {
    return chats.filter(chat => {
      const chatGptId = chat.fk_gpt_id || chat.gpt_id || chat.gptId;
      return chatGptId === gptId;
    });
  }

  /**
   * Busca chats por texto
   * @param {Array} chats - Lista de chats
   * @param {string} searchTerm - Termo de busca
   * @returns {Array} - Chats encontrados
   */
  searchChats(chats, searchTerm) {
    const term = searchTerm.toLowerCase();
    
    return chats.filter(chat => 
      (chat.name && chat.name.toLowerCase().includes(term)) ||
      (chat.id && chat.id.toLowerCase().includes(term))
    );
  }

  /**
   * Ordena chats por critério
   * @param {Array} chats - Lista de chats
   * @param {string} sortBy - Critério de ordenação
   * @param {string} order - Ordem (asc/desc)
   * @returns {Array} - Chats ordenados
   */
  sortChats(chats, sortBy = 'createdAt', order = 'desc') {
    return [...chats].sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      if (sortBy === 'createdAt') {
        valueA = new Date(valueA || 0);
        valueB = new Date(valueB || 0);
      } else if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (order === 'desc') {
        return valueB > valueA ? 1 : -1;
      }
      
      return valueA > valueB ? 1 : -1;
    });
  }

  /**
   * Mapeia chatflow ID para uso com proxy
   * @param {string} chatflowId - ID original do chatflow
   * @returns {string} - ID mapeado para proxy
   */
  mapChatflowId(chatflowId) {
    const mapping = {
      'lexi-ai': 'lexi-ai',
      'lexi-civel': 'lexi-civel',
      'lexi-penal': 'lexi-penal',
      'lexi-trabalhista': 'lexi-trabalhista',
      'lexi-imobiliario': 'lexi-imobiliario',
      'lexi-tributario': 'lexi-tributario',
      'lexi-previdenciario': 'lexi-previdenciario',
      'lexi-empresarial': 'lexi-empresarial',
      'lexi-familia': 'lexi-familia'
    };
    
    return mapping[chatflowId] || chatflowId;
  }
} 