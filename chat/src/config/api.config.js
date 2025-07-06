/**
 * Configurações da API
 */
export const API_CONFIG = {
  // Base URLs
  BASE_URL: 'https://webhook.power.tec.br',
  
  // Endpoints específicos
  ENDPOINTS: {
    LANCAMENTOS: '/webhook/voetur/v1/lancamentos',
    LANCAMENTOS_POST: '/webhook/voetur/v1/lancamentos/post',
    LANCAMENTOS_UPDATE: '/webhook/voetur/v1/lancamento/update',
    CENTROS_CUSTOS: '/webhook/voetur/v1/centros-de-custos',
    PROJETOS: '/webhook/voetur/v1/projetos',
    FILIAIS: '/webhook/voetur/v1/filiais',
    FORNECEDORES: '/webhook/voetur/v1/fornecedores',
    USER_PROFILE: '/webhook/voetur/v1/usuario/profile',
    CONTAS_FINANCEIRAS: '/webhook/voetur/v1/contas-financeiras',
    CHATS: '/webhook/v2/chats',
    UPLOAD: '/webhook/voetur/v2/upload',
    GPTS: '/webhook/lexidecis/gpt/list',
    GPT_CONFIG: '/webhook/lexidecis/gpt/config',
    CHAT_MESSAGE: '/webhook/lexidecis/v2/chatmessage',
    DOCUMENT_STORE: '/webhook/lexidecis/v2/documentstore'
  },
  
  // Configurações de requisição
  REQUEST_CONFIG: {
    TIMEOUT: 30000, // 30 segundos
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 segundo
  }
};

/**
 * Configurações do Flowise
 */
export const FLOWISE_CONFIG = {
  DEFAULT_API_HOST: window.location.origin,
  THEME: {
    disclaimer: {
      title: 'Disclaimer',
      message: 'By using this chatbot, you agree to the <a target="_blank" href="https://flowiseai.com/terms">Terms & Condition</a>',
      textColor: 'black',
      buttonColor: '#3b82f6',
      buttonText: 'Start Chatting',
      buttonTextColor: 'white',
      blurredBackgroundColor: 'rgba(0, 0, 0, 0.4)',
      backgroundColor: 'white',
    },
    chatWindow: {
      showTitle: true,
      showAgentMessages: true,
      welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
      backgroundColor: '#ffffff',
      fontSize: 16,
      poweredByTextColor: '#303235',
      botMessage: {
        backgroundColor: '#f7f8ff',
        textColor: '#303235',
        showAvatar: true,
        avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png',
      },
      userMessage: {
        backgroundColor: '#3B81F6',
        textColor: '#ffffff',
        showAvatar: true,
        avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png',
      },
      textInput: {
        placeholder: 'Digite sua mensagem...',
        backgroundColor: '#ffffff',
        textColor: '#303235',
        sendButtonColor: '#3B81F6',
        maxChars: 1000,
        maxCharsWarningMessage: 'Você excedeu o limite de caracteres. Por favor, digite uma mensagem mais curta.',
        autoFocus: true,
      },
      feedback: {
        color: '#303235',
      },
      footer: {
        textColor: '#303235',
        text: 'Powered by',
        company: 'LexiDecis',
        companyLink: 'https://lexidecis.com',
      }
    }
  }
}; 