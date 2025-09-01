const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const DEBUG_MODE = isLocalhost; // Define DEBUG_MODE com base no hostname

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

import { getJwt } from './auth.js';

/**
 * Classe responsável por realizar requisições às APIs definidas nas configurações.
 */
export default class ApiService {
    constructor(config) {
        this.config = config;
    }

    /**
     * Método genérico para realizar requisições a uma API específica.
     * Obtém automaticamente o JWT para métodos que precisam de autenticação adicional.
     * 
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} params - Parâmetros de consulta (query string) ou corpo.
     * @param {string} method - Método HTTP (GET, POST, DELETE, etc.).
     * @param {Object|null} body - Corpo da requisição, se aplicável.
     * @param {Object} options - Opções adicionais para a requisição.
     * @returns {Promise<any>} - Resposta JSON da API.
     */
    async request(apiKey, params = {}, method = 'GET', body = null, options = {}) {
        const apiConfig = this.config.apiCredentials[apiKey];
        if (!apiConfig) throw new Error(`Configuração da API '${apiKey}' não encontrada.`);

        // Construir a URL
        let url = apiConfig.URL;

        // Determinar se os parâmetros devem ser incluídos na query string
        const includeParamsInQuery = options.includeParamsInQuery || false;

        // Incluir parâmetros na query string se necessário
        if (method === 'GET' || method === 'DELETE' || includeParamsInQuery) {
            const queryString = new URLSearchParams(params).toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        // Configurações iniciais da requisição
        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Adicionar o JWT automaticamente para todos os métodos
        debugLog(`🔐 Obtendo JWT para requisição ${apiKey}...`);
        const jwt = await getJwt(); // Obtenha o JWT diretamente
        debugLog(`✅ JWT obtido (${jwt.length} chars) para ${apiKey}`);
        fetchOptions.headers['Authorization'] = `Bearer ${jwt}`;
        debugLog(`🔑 Header Authorization definido para ${apiKey}`);

        // Incluir 'body' se for fornecido e o método for apropriado
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            fetchOptions.body = JSON.stringify(body);
        }

        // Log de debug
        debugLog(`Fazendo requisição para ${url} com opções:`, fetchOptions);

        try {
            debugLog(`📡 Enviando requisição ${apiKey} para ${url}`);
            const response = await fetch(url, fetchOptions);
            debugLog(`📡 Resposta recebida ${apiKey}: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                debugLog(`❌ Erro na resposta ${apiKey}:`, errorText);

                if (response.status === 401) {
                    debugLog(`🚫 ERRO 401: JWT pode estar expirado ou inválido para ${apiKey}`);
                    throw new Error(`JWT expirado ou inválido. Faça login novamente.`);
                }

                throw new Error(`Erro na requisição ${apiKey}: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            debugLog(`✅ Requisição ${apiKey} concluída com sucesso`);
            return result;

        } catch (error) {
            debugLog(`❌ Falha na requisição ${apiKey}:`, error.message);
            throw new Error(`Falha ao realizar a requisição ${apiKey}: ${error.message}`);
        }
    }

    /**
     * Método para realizar uma requisição GET.
     * 
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} params - Parâmetros de consulta (query string).
     * @param {Object} options - Opções adicionais para a requisição.
     * @returns {Promise<any>} - Resposta JSON da API.
     */
    async get(apiKey, params = {}, options = {}) {
        return this.request(apiKey, params, 'GET', null, options);
    }

    /**
     * Método para realizar uma requisição POST.
     * 
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} body - Corpo da requisição.
     * @param {Object} options - Opções adicionais para a requisição.
     * @returns {Promise<any>} - Resposta JSON da API.
     */
    async post(apiKey, body = {}, options = {}) {
        return this.request(apiKey, {}, 'POST', body, options);
    }

    /**
     * Método para realizar uma requisição DELETE com JWT automaticamente.
     * 
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} params - Parâmetros de consulta (query string).
     * @returns {Promise<any>} - Resposta JSON da API.
     */
    async deleteWithJwt(apiKey, params = {}) {
        return this.request(apiKey, params, 'DELETE');
    }

    /**
     * Método para realizar uma requisição PUT.
     * 
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} body - Corpo da requisição.
     * @param {Object} options - Opções adicionais para a requisição.
     * @returns {Promise<any>} - Resposta JSON da API.
     */
    async put(apiKey, body = {}, options = {}) {
        return this.request(apiKey, {}, 'PUT', body, options);
    }

    /**
     * Método para realizar uma requisição PATCH.
     * 
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} body - Corpo da requisição.
     * @param {Object} options - Opções adicionais para a requisição.
     * @returns {Promise<any>} - Resposta JSON da API.
     */
    async patch(apiKey, body = {}, options = {}) {
        return this.request(apiKey, {}, 'PATCH', body, options);
    }
}