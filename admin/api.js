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
  const token = await user.getIdToken();
  
  const response = await fetch('https://webhook.power.tec.br/webhook/v1/users', {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  
  const dataText = await response.text();
  let data;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    console.error("Erro ao converter resposta para JSON:", e);
    console.error("Resposta recebida:", dataText);
    throw new Error("Resposta da API inválida");
  }
  
  if (!Array.isArray(data)) data = [data];
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