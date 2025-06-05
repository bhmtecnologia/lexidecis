/**
 * @file api.js
 * @description Módulo de API para interagir com o módulo Financeiro - Lançamentos,
 * permitindo criar, listar, atualizar e excluir lançamentos, além de realizar uploads de arquivos.
 * Utiliza autenticação via Firebase (AuthService).
 */

/**
 * Cria um novo lançamento.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {Object} payload - Objeto com os dados do lançamento a ser criado.
 *   Exemplo:
 *   {
 *     dados: {
 *       uid: "firebaseUID123",
 *       app_id: "empresaXYZ",
 *       descricao: "Compra de material de escritório",
 *       valor: 150.00,
 *       data_lancamento: "2025-04-02T10:00:00Z",
 *       categoria: "Material",
 *       status: "pendente",
 *       classificacoes: {
 *         departamento: "Financeiro",
 *         centro_custo: "CC-001",
 *         projeto: "Projeto A"
 *       }
 *     },
 *     anexos: [
 *       { url: "https://minio.seu-dominio.com/bucket/comprovante1.jpg", categoria: "comprovante" }
 *     ]
 *   }
 * @returns {Promise<Object>} - Objeto JSON do lançamento criado.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function createLancamento(AuthService, payload) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/lancamentos', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao criar lançamento: " + errorText);
  }

  return await response.json();
}

/**
 * Lista todos os lançamentos.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com os lançamentos.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listLancamentos(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/lancamentos/get', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar lançamentos: " + errorText);
  }

  return await response.json();
}

/**
 * Atualiza um lançamento existente.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} id - Identificador do lançamento a ser atualizado.
 * @param {Object} payload - Objeto com os dados atualizados do lançamento.
 * @returns {Promise<Object>} - Objeto JSON do lançamento atualizado.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function updateLancamento(AuthService, id, payload) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  // O endpoint correto para atualização é:
  // https://n8n.power.tec.br/webhook-test/voetur/v1/lancamento/update
  // Enviamos o id junto com o payload
  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/lancamento/update', {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ id, ...payload })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao atualizar lançamento: " + errorText);
  }

  return await response.json();
}

/**
 * Exclui um lançamento.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} id - Identificador do lançamento a ser excluído.
 * @returns {Promise<Object>} - Objeto JSON com a resposta da API.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function deleteLancamento(AuthService, id) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch(`https://webhook.power.tec.br/webhook/voetur/v1/lancamentos/${id}`, {
    method: "DELETE",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao excluir lançamento: " + errorText);
  }

  return await response.json();
}

/**
 * Faz o upload de um arquivo e retorna a URL gerada.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {File} file - Arquivo a ser enviado.
 * @returns {Promise<Object>} - Objeto JSON contendo a URL do arquivo.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro no upload.
 */
export async function uploadArquivo(AuthService, file) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v2/upload', {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
      // Não defina o Content-Type; o navegador faz isso automaticamente ao usar FormData.
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro no upload do arquivo: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os centros de custos.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com os centros de custos.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listCentrosCustos(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/centros-de-custos', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar centros de custos: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os projetos.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com os projetos.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listProjetos(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/projetos', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar projetos: " + errorText);
  }

  return await response.json();
}

/**
 * Lista as filiais.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com as filiais.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listFiliais(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/filiais', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar filiais: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os fornecedores.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {Object} [filter={}] - Filtros opcionais para busca, ex: { cnpj: '...' }
 * @returns {Promise<Array>} - Array com os fornecedores.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listFornecedores(AuthService, filter = {}) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const params = new URLSearchParams();
  if (filter.cnpj) params.append('cnpj', filter.cnpj);
  const url = `https://webhook.power.tec.br/webhook/voetur/v1/fornecedores${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar fornecedores: " + errorText);
  }

  return await response.json();
}

/**
 * Busca o perfil do usuário logado, incluindo permissões de rotas.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Object>} - Objeto JSON com o perfil do usuário.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function getUserProfile(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/v1/profile', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao obter perfil do usuário: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os centros de custos.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com os centros de custos.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listContasFinanceiras(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/contas-financeiras', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar centros de custos: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os chats do usuário.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com os chats do usuário.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listChats(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/v2/chats', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar chats: " + errorText);
  }

  return await response.json();
}

/**
 * Busca o histórico de mensagens de um chat específico.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} sessionId - Identificador da sessão do chat.
 * @param {string} chatflowId - Identificador do chatflow (configuração do fluxo).
 * @param {string} apiHost - URL base da API do Flowise (ex: https://proxy-5cun.onrender.com).
 * @param {string} token - Token de autenticação (caso necessário para acesso à API externa).
 * @returns {Promise<Array>} - Array com o histórico de mensagens do chat.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function fetchChatHistory(AuthService, sessionId, chatflowId, apiHost, token) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  await user.getIdToken(); // Garantir autenticação (mesmo que não usado neste fetch)

  const apiURL = `${apiHost}/api/v1/chatmessage/${chatflowId}?sessionId=${sessionId}`;
  console.debug('Buscando histórico em:', apiURL);

  try {
    const response = await fetch(apiURL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const responseBody = await response.text();
    console.debug('Status:', response.status, 'Resposta:', responseBody);

    if (!response.ok) throw new Error("Erro ao buscar histórico de mensagens");

    const apiHistory = JSON.parse(responseBody);

    return apiHistory.map((msg) => ({
      message: msg.content,
      type: msg.role === 'userMessage' ? 'userMessage' : 'apiMessage',
      dateTime: msg.createdDate || new Date().toISOString(),
      messageId: msg.id || Math.random().toString(36).substring(2),
      fileUploads: msg.fileUploads || []
    }));
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    throw new Error('Erro ao buscar histórico de mensagens da API.');
  }
}

/**
 * Injeta o histórico de chat formatado no localStorage para consumo pelo Flowise Embed.
 *
 * @param {string} chatflowId - ID do chatflow.
 * @param {string} sessionId - ID da sessão de chat.
 * @param {Array} history - Array retornado por fetchChatHistory.
 */
export function injectChatHistory(chatflowId, sessionId, history) {
  const keyExternal = `${chatflowId}_EXTERNAL`;
  const keyInjected = `${chatflowId}_historyInjected`;
  const chatData = { chatHistory: history, chatId: sessionId };
  localStorage.setItem(keyExternal, JSON.stringify(chatData));
  localStorage.setItem(keyInjected, 'true');
}

/**
 * Salva uma mensagem de chat no histórico externo.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} chatflowId - Identificador do chatflow.
 * @param {string} sessionId - Identificador da sessão de chat.
 * @param {string} role - Papel da mensagem ('user' ou 'assistant').
 * @param {string} content - Texto da mensagem.
 * @returns {Promise<Object>} - Objeto JSON com a resposta da API.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function createChatMessage(AuthService, chatflowId, sessionId, role, content) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const payload = {
    chatflowId,
    sessionId,
    role,
    content
  };

  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/v2/chatmessage', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao salvar mensagem de chat: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os GPTs disponíveis.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Array com os GPTs.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listGpts(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/gpt/list', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar GPTs: " + errorText);
  }

  return await response.json();
}


export { fetchChatHistory as getChatHistory };

/**
 * Busca a configuração completa de um GPT, incluindo overrides de Flowise (vector store, LangChain, tools, etc).
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} gptId - Identificador do GPT.
 * @returns {Promise<Object>} - Objeto JSON com todas as configurações do GPT.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function getGptConfig(AuthService, gptId) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch(`https://webhook.power.tec.br/webhook/lexidecis/v2/gpt/configs?gpt_id=${gptId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao buscar configurações do GPT: " + errorText);
  }

  return await response.json();
}

/**
 * Lista os documentos do document-store ou um documento específico se um ID for fornecido.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} [id] - (Opcional) Identificador do documento a ser buscado.
 * @returns {Promise<Array|Object>} - Array de documentos ou o documento solicitado.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listDocumentStore(AuthService, id) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const baseUrl = 'https://webhook.power.tec.br/webhook/lexidecis/v1/document-store';
  const url = id ? `${baseUrl}?id=${encodeURIComponent(id)}` : baseUrl;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar document-store: " + errorText);
  }

  return await response.json();
}