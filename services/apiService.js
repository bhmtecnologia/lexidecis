// Classe responsável por realizar requisições às APIs definidas nas configurações
export default class ApiService {
    constructor(config) {
        this.config = config;
    }

    /**
     * Método genérico para realizar requisições a uma API específica.
     * @param {string} apiKey - A chave da configuração da API no objeto CONFIG.
     * @param {Object} params - Parâmetros de consulta (query string) ou corpo.
     * @param {string} method - Método HTTP (GET, POST, etc.).
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

        const fetchOptions = {
            method,
            headers: {
                'Authorization': apiConfig.AUTH,
                'Content-Type': 'application/json'
            }
        };

        // Incluir 'body' se for fornecido e o método for apropriado
        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            fetchOptions.body = JSON.stringify(body);
        }
        
        // Log para depuração
        console.log(`Fazendo requisição para ${url} com opções:`, fetchOptions);
        
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) throw new Error(`Erro na requisição ${apiKey}: ${response.status} ${response.statusText}`);
            return response.json();
        } catch (error) {
            throw new Error(`Falha ao realizar a requisição ${apiKey}: ${error.message}`);
        }
    }
}