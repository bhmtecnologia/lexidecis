/**
 * @file financeiro-lancamentos-list.js
 * @description Responsável por renderizar a página de "Financeiro - Listagem de Lançamentos" no módulo financeiro,
 * realizando a consulta dos dados via API e exibindo-os em uma tabela completa com todas as informações.
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { listLancamentos } from "./api.js"; // Função para listar os lançamentos via API

/**
 * Renderiza a tela de "Financeiro - Listagem de Lançamentos".
 * Define a estrutura HTML da página, configura a tabela e atualiza os dados via API.
 */
export async function renderFinanceiroLancamentosList() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid position-relative">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Listagem de Lançamentos</h2>
            <p class="mb-0 text-title-gray">Visualize todos os lançamentos cadastrados com todos os detalhes</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Listagem de Lançamentos</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Área da Tabela -->
      <div id="table-section" class="mt-4">
        <div class="card">
          <div class="card-body">
            <div id="tableContainer" class="table-responsive">
              <table id="lancamentosTable" class="display table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Data do Lançamento</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th>Departamento</th>
                    <th>Centro de Custo</th>
                    <th>Projeto</th>
                    <th>Anexos</th>
                    <th>Criado Em</th>
                    <th>Atualizado Em</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Overlay de Loading -->
      <div id="tableOverlay" class="d-none position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 1000;">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
      </div>
    </div>
  `;

  /**
   * Formata uma data (string ISO) para o padrão 'pt-BR'.
   * @param {string} dateStr - Data no formato ISO.
   * @returns {string} Data formatada.
   */
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  /**
   * Formata um valor numérico para o formato de moeda BRL.
   * @param {number|string} value - Valor a ser formatado.
   * @returns {string} Valor formatado como moeda.
   */
  function formatCurrency(value) {
    if (isNaN(value)) return '-';
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /**
   * Gera um link de anexo a partir do objeto de anexo.
   * Caso o anexo seja um array (modo antigo), gera uma lista de links.
   * Caso seja um objeto, gera um único link.
   * @param {Object|Array} anexos - Objeto ou array de anexos.
   * @returns {string} HTML com os links dos anexos.
   */
  function formatAnexos(anexos) {
    if (!anexos) return '-';
    if (Array.isArray(anexos) && anexos.length > 0) {
      return anexos.map(anexo => `<a href="${anexo.url}" target="_blank">${anexo.categoria}</a>`).join(', ');
    } else if (typeof anexos === 'object') {
      return `<a href="${anexos.url}" target="_blank">${anexos.categoria}</a>`;
    }
    return '-';
  }

  /**
   * Atualiza a tabela com os lançamentos obtidos via API.
   */
  async function updateTable() {
    const overlay = document.getElementById('tableOverlay');
    overlay.classList.remove('d-none');

    try {
      const lancamentos = await listLancamentos(AuthService);
      const tbody = document.querySelector('#lancamentosTable tbody');
      tbody.innerHTML = ''; // Limpa o conteúdo atual

      lancamentos.forEach(lanc => {
        const dados = lanc.dados || {};
        const classificacoes = dados.classificacoes || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${lanc.id || '-'}</td>
          <td>${dados.descricao || '-'}</td>
          <td>${dados.valor ? formatCurrency(dados.valor) : '-'}</td>
          <td>${dados.data_lancamento ? formatDate(dados.data_lancamento) : '-'}</td>
          <td>${dados.categoria || '-'}</td>
          <td>${dados.status || '-'}</td>
          <td>${classificacoes.departamento || '-'}</td>
          <td>${classificacoes.centro_custo || '-'}</td>
          <td>${classificacoes.projeto || '-'}</td>
          <td>${formatAnexos(lanc.anexos)}</td>
          <td>${lanc.created_at ? formatDate(lanc.created_at) : '-'}</td>
          <td>${lanc.updated_at ? formatDate(lanc.updated_at) : '-'}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (error) {
      console.error("Erro ao listar lançamentos:", error);
      alert("Erro ao listar lançamentos: " + error.message);
    } finally {
      overlay.classList.add('d-none');
    }
  }

  // Monitora a autenticação para exibir a tabela somente se o usuário estiver logado
  AuthService.onAuthChange((user) => {
    if (user) {
      updateTable();
    } else {
      content.innerHTML = `
        <div class="container-fluid">
          <div class="alert alert-warning text-center mt-4">
            Autenticação necessária
          </div>
        </div>
      `;
    }
  });
}

// Registra a rota para a página de "Financeiro - Listagem de Lançamentos"
registerRoute('#financeiro-lancamentos-list', renderFinanceiroLancamentosList);