/**
 * @file mockData.js
 * @description Dados mock consistentes para testes da aplicação Chat LexiDecis
 * @version 1.0
 */

// ============================
// 1. DADOS DE USUÁRIO
// ============================

export const mockUsers = {
    admin: {
        id: 'admin-123',
        email: 'admin@lexidecis.com',
        name: 'Administrador',
        role: 'admin',
        tenant: 'lexidecis',
        uuid: 'admin-uuid-123'
    },
    user: {
        id: 'user-456',
        email: 'usuario@empresa.com',
        name: 'Usuário Teste',
        role: 'user',
        tenant: 'empresa',
        uuid: 'user-uuid-456'
    },
    guest: {
        id: 'guest-789',
        email: 'convidado@teste.com',
        name: 'Convidado',
        role: 'guest',
        tenant: 'teste',
        uuid: 'guest-uuid-789'
    }
};

// ============================
// 2. DADOS DE GPTs
// ============================

export const mockGPTs = {
    gpt4: {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Modelo avançado da OpenAI',
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 8192,
        temperature: 0.7,
        isActive: true,
        icon: 'bi-robot',
        color: '#10a37f'
    },
    gpt35: {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Modelo rápido e eficiente',
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        maxTokens: 4096,
        temperature: 0.7,
        isActive: true,
        icon: 'bi-robot',
        color: '#10a37f'
    },
    claude: {
        id: 'claude-3',
        name: 'Claude 3',
        description: 'Modelo da Anthropic',
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        maxTokens: 4096,
        temperature: 0.7,
        isActive: true,
        icon: 'bi-robot',
        color: '#d97706'
    },
    gemini: {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Modelo do Google',
        provider: 'google',
        model: 'gemini-pro',
        maxTokens: 8192,
        temperature: 0.7,
        isActive: true,
        icon: 'bi-robot',
        color: '#4285f4'
    },
    flowise: {
        id: 'flowise-engine',
        name: 'AI Agents Engine',
        description: 'Motor de agentes de IA',
        provider: 'flowise',
        model: 'custom',
        maxTokens: 4096,
        temperature: 0.7,
        isActive: true,
        icon: 'bi-cpu',
        color: '#8b5cf6'
    }
};

// ============================
// 3. DADOS DE CHATS
// ============================

export const mockChats = [
    {
        id: 'chat-001',
        name: 'Conversa sobre Direito Civil',
        last_modified: '2024-01-15T10:30:00Z',
        message_count: 15,
        gpt_id: 'gpt-4',
        user_id: 'user-456',
        company_name: 'empresa',
        is_active: true,
        created_at: '2024-01-15T09:00:00Z'
    },
    {
        id: 'chat-002',
        name: 'Análise de Contrato',
        last_modified: '2024-01-14T16:45:00Z',
        message_count: 8,
        gpt_id: 'claude-3',
        user_id: 'user-456',
        company_name: 'empresa',
        is_active: true,
        created_at: '2024-01-14T14:00:00Z'
    },
    {
        id: 'chat-003',
        name: 'Dúvidas Trabalhistas',
        last_modified: '2024-01-13T11:20:00Z',
        message_count: 23,
        gpt_id: 'gpt-3.5-turbo',
        user_id: 'user-456',
        company_name: 'empresa',
        is_active: true,
        created_at: '2024-01-13T10:00:00Z'
    },
    {
        id: 'chat-004',
        name: 'Consultoria Tributária',
        last_modified: '2024-01-12T15:10:00Z',
        message_count: 12,
        gpt_id: 'gemini-pro',
        user_id: 'user-456',
        company_name: 'empresa',
        is_active: false,
        created_at: '2024-01-12T13:00:00Z'
    }
];

// ============================
// 4. DADOS DE MENSAGENS
// ============================

export const mockMessages = {
    'chat-001': [
        {
            id: 'msg-001',
            chat_id: 'chat-001',
            content: 'Olá! Preciso de ajuda com uma questão de direito civil.',
            role: 'user',
            timestamp: '2024-01-15T09:00:00Z',
            gpt_id: 'gpt-4'
        },
        {
            id: 'msg-002',
            chat_id: 'chat-001',
            content: 'Olá! Ficarei feliz em ajudá-lo com questões de direito civil. Pode me explicar melhor qual é a sua dúvida?',
            role: 'assistant',
            timestamp: '2024-01-15T09:00:30Z',
            gpt_id: 'gpt-4'
        },
        {
            id: 'msg-003',
            chat_id: 'chat-001',
            content: 'Tenho uma questão sobre responsabilidade civil em um acidente de trânsito.',
            role: 'user',
            timestamp: '2024-01-15T09:01:00Z',
            gpt_id: 'gpt-4'
        }
    ],
    'chat-002': [
        {
            id: 'msg-004',
            chat_id: 'chat-002',
            content: 'Preciso analisar um contrato de prestação de serviços.',
            role: 'user',
            timestamp: '2024-01-14T14:00:00Z',
            gpt_id: 'claude-3'
        },
        {
            id: 'msg-005',
            chat_id: 'chat-002',
            content: 'Posso ajudá-lo a analisar o contrato. Pode compartilhar o documento ou me contar os pontos principais que gostaria de verificar?',
            role: 'assistant',
            timestamp: '2024-01-14T14:00:30Z',
            gpt_id: 'claude-3'
        }
    ]
};

// ============================
// 5. DADOS DE CONFIGURAÇÃO
// ============================

export const mockConfig = {
    userId: 'user-456',
    companyName: 'empresa',
    userName: 'usuario@empresa.com',
    flowise: {
        chatflowId: 'flow-123',
        apiHost: 'https://flowise.power.tec.br',
        token: 'mock-token-123'
    },
    apiCredentials: {
        openai: 'sk-mock-openai-key',
        anthropic: 'sk-mock-anthropic-key',
        google: 'mock-google-key'
    },
    settings: {
        theme: 'light',
        language: 'pt-BR',
        autoSave: true,
        notifications: true
    }
};

// ============================
// 6. DADOS DE ENDPOINTS
// ============================

export const mockEndpoints = {
    readChat: {
        url: 'https://api.lexidecis.com/chat/read',
        method: 'GET',
        timeout: 5000
    },
    createChat: {
        url: 'https://api.lexidecis.com/chat/create',
        method: 'POST',
        timeout: 5000
    },
    updateChat: {
        url: 'https://api.lexidecis.com/chat/update',
        method: 'PUT',
        timeout: 5000
    },
    deleteChat: {
        url: 'https://api.lexidecis.com/chat/delete',
        method: 'DELETE',
        timeout: 5000
    },
    sendMessage: {
        url: 'https://api.lexidecis.com/chat/message',
        method: 'POST',
        timeout: 30000
    },
    getGPTs: {
        url: 'https://api.lexidecis.com/gpts',
        method: 'GET',
        timeout: 5000
    }
};

// ============================
// 7. DADOS DE ESTADO
// ============================

export const mockState = {
    currentSessionId: 'session-123',
    selectedChat: 'chat-001',
    selectedGPT: mockGPTs.gpt4,
    chats: mockChats,
    gpts: Object.values(mockGPTs),
    isLoadingGPTs: false,
    isGPTSelectionLoading: false,
    gptConfig: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0
    }
};

// ============================
// 8. DADOS DE ERROS
// ============================

export const mockErrors = {
    networkError: {
        type: 'NetworkError',
        message: 'Erro de conexão com a API',
        code: 'NETWORK_ERROR',
        details: 'Falha ao conectar com o servidor'
    },
    authError: {
        type: 'AuthError',
        message: 'Erro de autenticação',
        code: 'AUTH_ERROR',
        details: 'Token inválido ou expirado'
    },
    validationError: {
        type: 'ValidationError',
        message: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: 'Campos obrigatórios não preenchidos'
    },
    apiError: {
        type: 'APIError',
        message: 'Erro da API',
        code: 'API_ERROR',
        details: 'Erro interno do servidor'
    }
};

// ============================
// 9. DADOS DE PERFORMANCE
// ============================

export const mockPerformanceData = {
    loadTimes: {
        initialLoad: 2500,
        chatLoad: 800,
        gptLoad: 1200,
        messageSend: 1500
    },
    memoryUsage: {
        initial: 45,
        afterChatLoad: 52,
        afterMessageSend: 58,
        peak: 65
    },
    responseTimes: {
        gpt4: 2500,
        gpt35: 1800,
        claude: 2200,
        gemini: 2000,
        flowise: 3000
    }
};

// ============================
// 10. DADOS DE TESTE ESPECÍFICOS
// ============================

export const mockTestData = {
    // Dados para testes de UI
    uiElements: {
        sidebar: '#sidebarMenu',
        chatList: '#chat-list',
        searchInput: '#search-input',
        newChatButton: '#new-chat-button',
        gptButton: '#select-gpt-button',
        userMenu: '#user-menu-trigger'
    },
    
    // Dados para testes de eventos
    events: {
        click: 'click',
        input: 'input',
        change: 'change',
        submit: 'submit',
        keydown: 'keydown'
    },
    
    // Dados para testes de responsividade
    screenSizes: {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1920, height: 1080 }
    },
    
    // Dados para testes de acessibilidade
    accessibility: {
        ariaLabels: ['search', 'new-chat', 'select-gpt', 'user-menu'],
        keyboardShortcuts: ['Enter', 'Escape', 'Tab', 'ArrowDown']
    }
};

// ============================
// 11. FUNÇÕES AUXILIARES
// ============================

/**
 * Gera dados mock dinâmicos
 * @param {string} type - Tipo de dados
 * @param {Object} options - Opções de geração
 * @returns {*} Dados gerados
 */
export function generateMockData(type, options = {}) {
    switch (type) {
        case 'chat':
            return {
                id: `chat-${Date.now()}`,
                name: options.name || 'Chat Teste',
                last_modified: new Date().toISOString(),
                message_count: options.messageCount || 0,
                gpt_id: options.gptId || 'gpt-4',
                user_id: options.userId || 'user-456',
                company_name: options.companyName || 'empresa',
                is_active: true,
                created_at: new Date().toISOString()
            };
            
        case 'message':
            return {
                id: `msg-${Date.now()}`,
                chat_id: options.chatId || 'chat-001',
                content: options.content || 'Mensagem de teste',
                role: options.role || 'user',
                timestamp: new Date().toISOString(),
                gpt_id: options.gptId || 'gpt-4'
            };
            
        case 'user':
            return {
                id: `user-${Date.now()}`,
                email: options.email || 'teste@exemplo.com',
                name: options.name || 'Usuário Teste',
                role: options.role || 'user',
                tenant: options.tenant || 'teste',
                uuid: `uuid-${Date.now()}`
            };
            
        default:
            throw new Error(`Tipo de dados mock desconhecido: ${type}`);
    }
}

/**
 * Limpa dados mock do localStorage/sessionStorage
 */
export function clearMockData() {
    const keys = [
        'lexidecis_state',
        'lexidecis_chats',
        'lexidecis_gpts',
        'lexidecis_session',
        'tenant',
        'uuid',
        'email'
    ];
    
    keys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
}

/**
 * Configura dados mock no localStorage/sessionStorage
 * @param {Object} data - Dados a serem configurados
 */
export function setupMockData(data = {}) {
    // Configurar dados básicos
    sessionStorage.setItem('tenant', data.tenant || 'empresa');
    sessionStorage.setItem('uuid', data.uuid || 'user-456');
    sessionStorage.setItem('email', data.email || 'usuario@empresa.com');
    
    // Configurar estado se fornecido
    if (data.state) {
        localStorage.setItem('lexidecis_state', JSON.stringify(data.state));
    }
    
    // Configurar chats se fornecidos
    if (data.chats) {
        localStorage.setItem('lexidecis_chats', JSON.stringify(data.chats));
    }
    
    // Configurar GPTs se fornecidos
    if (data.gpts) {
        localStorage.setItem('lexidecis_gpts', JSON.stringify(data.gpts));
    }
} 