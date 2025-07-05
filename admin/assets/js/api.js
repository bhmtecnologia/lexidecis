/**
 * Módulo de API para a aplicação Lexidecis.
 * 
 * Contém funções para interagir com as APIs de usuários, companies, units, GPTs e configurações dos GPTs,
 * utilizando cache para reduzir chamadas desnecessárias.
 *
 * @module api
 */

/** 
 * Cache global para units, evitando chamadas repetidas à API.
 * @type {Object|Array|null}
 */
export let cachedUnits = null;

/** 
 * Cache global para companies, evitando chamadas repetidas à API.
 * @type {Object|Array|null}
 */
export let cachedCompanies = null;

/**
 * Recupera a lista de units a partir da API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Object|Array>} - Uma promise que resolve com os dados das units.
 * @throws {Error} Se o usuário não estiver autenticado ou se a resposta da API for inválida.
 */
export async function getUnits(AuthService) {
  if (cachedUnits !== null) return cachedUnits;
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/v1/units', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  const dataText = await response.text();
  let units;
  try {
    units = JSON.parse(dataText);
  } catch (e) {
    console.error("Erro ao converter resposta das units:", e);
    throw new Error("Resposta da API de units inválida");
  }
  
  cachedUnits = units;
  return units;
}

/**
 * Recupera a lista de companies a partir da API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Object|Array>} - Uma promise que resolve com os dados das companies.
 * @throws {Error} Se o usuário não estiver autenticado ou se a resposta da API for inválida.
 */
export async function getCompanies(AuthService) {
  if (cachedCompanies !== null) return cachedCompanies;
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/v1/companies', {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  const dataText = await response.text();
  let companies;
  try {
    companies = JSON.parse(dataText);
  } catch (e) {
    console.error("Erro ao converter resposta das companies:", e);
    throw new Error("Resposta da API de companies inválida");
  }
  
  cachedCompanies = companies;
  return companies;
}

/**
 * Busca a lista de usuários a partir da API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @returns {Promise<Array>} - Uma promise que resolve com um array de objetos de usuário.
 * @throws {Error} Se o usuário não estiver autenticado ou se a resposta da API for inválida.
 */
export async function fetchUsers(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  
  console.log('[fetchUsers] 🔍 Iniciando busca de usuários...');
  console.log('[fetchUsers] 👤 Usuário autenticado:', user.email);
  
  const token = await user.getIdToken();
  console.log('[fetchUsers] 🔑 Token obtido:', token ? 'Presente' : 'Ausente');
  console.log('[fetchUsers] 📏 Tamanho do token:', token?.length);
  
  const url = 'https://webhook.power.tec.br/webhook/v1/users';
  console.log('[fetchUsers] 🔗 URL:', url);
  
  const response = await fetch(url, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  console.log('[fetchUsers] 📡 Response status:', response.status);
  console.log('[fetchUsers] ✅ Response ok:', response.ok);
  console.log('[fetchUsers] 📋 Response headers:', [...response.headers.entries()]);
  
  const dataText = await response.text();
  console.log('[fetchUsers] 📝 Raw response:', dataText);
  console.log('[fetchUsers] 📏 Response length:', dataText.length);
  
  let data;
  try {
    data = JSON.parse(dataText);
    console.log('[fetchUsers] ✅ JSON parsed successfully');
    console.log('[fetchUsers] 📊 Data type:', typeof data);
    console.log('[fetchUsers] 📊 Data:', data);
  } catch (e) {
    console.error('[fetchUsers] ❌ Erro ao converter resposta para JSON:', e);
    console.error('[fetchUsers] 📝 Resposta recebida:', dataText);
    console.error('[fetchUsers] 📊 Response status:', response.status);
    console.error('[fetchUsers] 📊 Response statusText:', response.statusText);
    throw new Error("Resposta da API inválida");
  }
  
  if (!Array.isArray(data)) data = [data];
  console.log('[fetchUsers] 🎯 Final data:', data);
  return data;
}

/**
 * Cria um novo usuário enviando os dados para a API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {Object} payload - Dados do novo usuário.
 * @returns {Promise<Object>} - Uma promise que resolve com o objeto do novo usuário criado.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function createUser(AuthService, payload) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/users/create', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao criar usuário: " + errorText);
  }
  
  return await response.json();
}

/**
 * Atualiza os dados de um usuário existente enviando as alterações para a API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {Object} payload - Dados atualizados do usuário.
 * @returns {Promise<Object>} - Uma promise que resolve com o objeto do usuário atualizado.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function updateUser(AuthService, payload) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/users/update', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao atualizar usuário: " + errorText);
  }
  
  return await response.json();
}

/**
 * Remove um usuário enviando uma requisição DELETE para a API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string|number} userId - ID do usuário a ser removido.
 * @returns {Promise<Object>} - Uma promise que resolve com a resposta da API.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function deleteUser(AuthService, userId) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/users', {
    method: "DELETE",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ id: userId })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao remover usuário: " + errorText);
  }
  
  return await response.json();
}

/**
 * Recupera a lista de GPTs a partir da API para uma unit específica.
 * 
 * Envia o unit_id como parâmetro na query e utiliza o mesmo método de autenticação via JWT.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} unitId - ID da unit para a qual os GPTs devem ser buscados.
 * @returns {Promise<Array>} - Uma promise que resolve com os dados dos GPTs.
 * @throws {Error} Se o usuário não estiver autenticado ou se a resposta da API for inválida.
 */
export async function getGPTs(AuthService, unitId) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  const url = `https://webhook.power.tec.br/webhook/lexidecis/gpt/list?unit_id=${encodeURIComponent(unitId)}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  const dataText = await response.text();
  let gpts;
  try {
    gpts = JSON.parse(dataText);
  } catch (e) {
    console.error("Erro ao converter resposta da API de GPTs:", e);
    throw new Error("Resposta da API de GPTs inválida");
  }
  
  return gpts;
}

/**
 * Recupera as configurações de um GPT a partir da API.
 * 
 * Envia o gpt_id como parâmetro de query e utiliza JWT para autenticação.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} gptId - ID do GPT cujas configurações devem ser buscadas.
 * @returns {Promise<Array>} - Uma promise que resolve com os dados de configuração do GPT.
 * @throws {Error} Se o usuário não estiver autenticado ou se a resposta da API for inválida.
 */
export async function getGPTConfigs(AuthService, gptId) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  const url = `https://webhook.power.tec.br/webhook/lexidecis/gpt/configs?gpt_id=${encodeURIComponent(gptId)}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  const dataText = await response.text();
  let configs;
  try {
    configs = JSON.parse(dataText);
  } catch (e) {
    console.error("Erro ao converter resposta da API de GPT configs:", e);
    throw new Error("Resposta da API de GPT configs inválida");
  }
  
  return configs;
}

/**
 * Atualiza os vínculos de GPTs de uma unit específica.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string} unitId - ID da unit cujos GPTs serão atualizados.
 * @param {Array<string>} gptIds - Array de IDs de GPTs que devem ficar vinculados à unit.
 * @returns {Promise<Object>} - Resposta da API confirmando a atualização.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function setUnitGPTs(AuthService, unitId, gptIds) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  const url = 'https://n8n.power.tec.br/webhook/lexidecis/units/gpts';
  const payload = {
    unit_id: unitId,
    gpt_ids: gptIds
  };
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao salvar vínculos de GPTs: " + errorText);
  }
  return await response.json();
}

/**
 * Cria um novo GPT enviando os dados para a API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {Object} payload - Dados do novo GPT.
 * @returns {Promise<Object>} - Uma promise que resolve com o objeto do novo GPT criado.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function createGPT(AuthService, payload) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/gpt/create', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao criar GPT: " + errorText);
  }
  
  return await response.json();
}

/**
 * Atualiza os dados de um GPT existente enviando as alterações para a API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {Object} payload - Dados atualizados do GPT.
 * @returns {Promise<Object>} - Uma promise que resolve com o objeto do GPT atualizado.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function updateGPT(AuthService, payload) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/gpt/update', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao atualizar GPT: " + errorText);
  }
  
  return await response.json();
}

/**
 * Remove um GPT enviando uma requisição DELETE para a API.
 *
 * @param {Object} AuthService - Serviço de autenticação contendo o usuário atual.
 * @param {string|number} gptId - ID do GPT a ser removido.
 * @returns {Promise<Object>} - Uma promise que resolve com a resposta da API.
 * @throws {Error} Se o usuário não estiver autenticado ou se a API retornar um erro.
 */
export async function deleteGPT(AuthService, gptId) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/lexidecis/gpt/delete', {
    method: "DELETE",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ id: gptId })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao remover GPT: " + errorText);
  }
  
  return await response.json();
}

/**
 * Verifica o status do AI Agents Engine (Flowise) para saber se está funcionando.
 *
 * @returns {Promise<Object>} - Uma promise que resolve com o status do AI Agents Engine.
 * @throws {Error} Se não conseguir conectar ou se o serviço estiver indisponível.
 */
export async function checkFlowiseStatus() {
  try {
    const response = await fetch('https://flowise.power.tec.br/ping', {
      method: 'GET',
      headers: {
        'Accept': '*/*'
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok && response.status === 200) {
      const responseText = await response.text();
      // Verificar se é uma resposta HTML do Flowise (indicando que está funcionando)
      const isFlowiseResponse = responseText.includes('Flowise') || responseText.includes('Build AI Agents');
      return {
        status: 'ok',
        message: isFlowiseResponse ? 'AI Agents Engine funcionando normalmente' : 'AI Agents Engine respondendo',
        response: isFlowiseResponse ? 'AI Agents Dashboard' : responseText,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'error',
        message: `AI Agents Engine retornou status ${response.status}`,
        response: response.statusText,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: 'AI Agents Engine não está respondendo',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

