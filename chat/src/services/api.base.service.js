import { API_CONFIG } from '../config/api.config.js';

/**
 * Serviço base para requisições HTTP
 */
export class ApiBaseService {
  constructor(authService) {
    this.authService = authService;
    this.baseUrl = API_CONFIG.BASE_URL;
    this.config = API_CONFIG.REQUEST_CONFIG;
  }

  /**
   * Executa uma requisição HTTP com configurações padronizadas
   * @param {string} endpoint - Endpoint da API
   * @param {object} options - Opções da requisição
   * @returns {Promise<any>} - Resposta da API
   */
  async request(endpoint, options = {}) {
    const user = this.authService.user;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const token = await user.getIdToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      timeout: this.config.TIMEOUT
    };

    const requestOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await this.fetchWithRetry(url, requestOptions);
      return await this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Executa fetch com retry automático
   * @param {string} url - URL da requisição
   * @param {object} options - Opções da requisição
   * @returns {Promise<Response>} - Resposta da requisição
   */
  async fetchWithRetry(url, options) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.config.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Se a resposta for bem-sucedida, retorna
        if (response.ok) {
          return response;
        }
        
        // Se não for erro 5xx, não tenta novamente
        if (response.status < 500) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;
        
        // Se não é o último tentativa, aguarda antes de tentar novamente
        if (attempt < this.config.RETRY_ATTEMPTS) {
          await this.delay(this.config.RETRY_DELAY * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Processa a resposta da API
   * @param {Response} response - Resposta da requisição
   * @returns {Promise<any>} - Dados da resposta
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  /**
   * Trata erros da API
   * @param {Error} error - Erro capturado
   * @returns {Error} - Erro tratado
   */
  handleError(error) {
    console.error('Erro na requisição:', error);
    
    if (error.name === 'AbortError') {
      return new Error('Requisição cancelada por timeout');
    }
    
    if (error.message.includes('Failed to fetch')) {
      return new Error('Erro de conexão. Verifique sua internet.');
    }
    
    return error;
  }

  /**
   * Utilitário para delay
   * @param {number} ms - Milissegundos para aguardar
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Requisição GET
   * @param {string} endpoint - Endpoint da API
   * @param {object} options - Opções adicionais
   * @returns {Promise<any>} - Resposta da API
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Requisição POST
   * @param {string} endpoint - Endpoint da API
   * @param {object} data - Dados para envio
   * @param {object} options - Opções adicionais
   * @returns {Promise<any>} - Resposta da API
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Requisição PUT
   * @param {string} endpoint - Endpoint da API
   * @param {object} data - Dados para envio
   * @param {object} options - Opções adicionais
   * @returns {Promise<any>} - Resposta da API
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Requisição DELETE
   * @param {string} endpoint - Endpoint da API
   * @param {object} options - Opções adicionais
   * @returns {Promise<any>} - Resposta da API
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
} 