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

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/lancamentos', {
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

  const response = await fetch(`https://n8n.power.tec.br/webhook-test/voetur/v1/lancamentos/${id}`, {
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

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/upload', {
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
 * @returns {Promise<Array>} - Array com os fornecedores.
 * @throws {Error} Se o usuário não estiver autenticado ou se ocorrer erro na API.
 */
export async function listFornecedores(AuthService) {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/fornecedores', {
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