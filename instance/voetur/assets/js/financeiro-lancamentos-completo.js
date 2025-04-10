/****
 * @file financeiro-lancamentos-completo.js
 * @description Página que exibe todos os lançamentos com todas as colunas disponíveis conforme retorno da API.
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { listLancamentos, listFiliais, listFornecedores, listProjetos, listCentrosCustos } from "./api.js";

// Funções utilitárias para formatação
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('pt-BR', { timeZone: 'UTC' });
}

function formatCurrency(value) {
  if (isNaN(value)) return '-';
  return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatAnexos(anexos) {
  if (!anexos) return '-';
  let lista = [];
  if (anexos.anexos && Array.isArray(anexos.anexos)) {
    lista = anexos.anexos;
  } else if (Array.isArray(anexos)) {
    lista = anexos;
  } else if (typeof anexos === 'object' && anexos.url) {
    return `<a href="${anexos.url}" target="_blank">${anexos.categoria || 'Anexo'}</a>`;
  } else {
    return '-';
  }
  return lista.map(anexo => `<a href="${anexo.url}" target="_blank">${anexo.categoria || 'Anexo'}</a>`).join('<br>');
}

// Função auxiliar para carregar lançamentos sem cache, utilizando all=true
async function loadLancamentosNoCache() {
  const user = AuthService.user;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();
  const response = await fetch('https://n8n.power.tec.br/webhook/voetur/v1/lancamentos?all=true&ts=' + Date.now(), {
    method: "GET",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Erro ao listar lançamentos: " + errorText);
  }
  return await response.json();
}

// Funções para exibir e esconder overlay de carregamento
function showLoading() {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "10000";
    overlay.innerHTML = `<div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Carregando...</span>
    </div>`;
    document.body.appendChild(overlay);
  } else {
    overlay.style.display = "flex";
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

export async function renderFinanceiroLancamentosCompleto() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Overlay de Carregamento -->
      <div id="loadingOverlay" style="display: none;"></div>
      
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Lançamentos - Visualização Completa</h2>
            <p class="mb-0 text-title-gray">Exibição de todos os lançamentos com todas as colunas disponíveis</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Lançamentos Completo</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Tabela Completa de Lançamentos -->
      <div class="card">
        <div class="card-header">
          <h5>Tabela Completa de Lançamentos</h5>
        </div>
        <div class="card-body table-responsive">
          <table id="lancamentosTable" class="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Status</th>
                <th>Anexo(s)</th>
                <th>Filial</th>
                <th>Data de Inclusão</th>
                <th>Data de Emissão</th>
                <th>Data de Vencimento</th>
                <th>Fornecedor</th>
                <th>N do documento</th>
                <th>Valor</th>
                <th>Justificativa</th>
                <th>Tipo de Documento</th>
                <th>Forma de Pagamento</th>
                <th>Centro de Custo</th>
                <th>Projeto</th>
                <th>Email</th>
                <th>Data criação</th>
                <th>id usuário criação</th>
                <th>Data alteração</th>
                <th>id usuário alteração</th>
              </tr>
            </thead>
            <tbody id="lancamentos-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Função para inicializar o DataTable com paginação, menu de seleção e ordenação por data de criação
  function initializeDataTable() {
    if (window.jQuery && $.fn.DataTable) {
      if ($.fn.DataTable.isDataTable("#lancamentosTable")) {
        $("#lancamentosTable").DataTable().destroy();
      }
      $("#lancamentosTable").DataTable({
        responsive: true,
        autoWidth: false,
        ordering: true,
        order: [[15, "desc"]], // Ordena pela coluna 'Data criação' (índice 15) de forma decrescente
        colReorder: true,
        paging: true, // Habilita paginação
        pageLength: 10, // Exibe 10 registros por página
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]], // Menu para selecionar a quantidade de itens
        dom: 'lBfrtip',
        buttons: ['copy', 'excel', 'csv', 'pdf'],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
        }
      });
    } else {
      console.error("DataTables não está carregado.");
    }
  }

  // Função que carrega os dados e atualiza a tabela completa
  async function loadLancamentosCompleto() {
    try {
      showLoading();
      // Carrega os dados de mapeamento para filiais, fornecedores, projetos e centros de custo
      const [filiais, fornecedores, projetos, centros] = await Promise.all([
        listFiliais(AuthService),
        listFornecedores(AuthService),
        listProjetos(AuthService),
        listCentrosCustos(AuthService)
      ]);
      window.filiaisData = filiais;
      window.fornecedoresData = fornecedores;
      window.projetosData = projetos;
      window.centrosData = centros;

      // Limpa o tbody da tabela
      const tbody = document.getElementById('lancamentos-tbody');
      tbody.innerHTML = '';

      // Carrega os lançamentos sem cache (com all=true)
      const dados = await loadLancamentosNoCache();

      // Para cada lançamento, mapeia os campos que utilizam UUID para seus respectivos nomes
      dados.forEach(lanc => {
        const dadosLanc = lanc.dados || {};

        const filialObj = window.filiaisData.find(f => f.uuid === dadosLanc.filial);
        const filialName = filialObj ? filialObj.nome : dadosLanc.filial || '-';

        const fornecedorObj = window.fornecedoresData.find(f => f.uuid === dadosLanc.fornecedor);
        const fornecedorName = fornecedorObj ? fornecedorObj.nome : dadosLanc.fornecedor || '-';

        const centroObj = window.centrosData.find(c => c.uuid === dadosLanc.centro_custo);
        const centroName = centroObj ? centroObj.nome : dadosLanc.centro_custo || '-';

        const projetoObj = window.projetosData.find(p => p.uuid === dadosLanc.projeto);
        const projetoName = projetoObj ? projetoObj.nome : dadosLanc.projeto || '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dadosLanc.status || '-'}</td>
          <td>${formatAnexos(lanc.anexos)}</td>
          <td>${filialName}</td>
          <td>${lanc.created_at ? formatDateTime(lanc.created_at) : '-'}</td>
          <td>${dadosLanc.dataEmissao ? formatDate(dadosLanc.dataEmissao) : '-'}</td>
          <td>${dadosLanc.vencimento ? formatDate(dadosLanc.vencimento) : '-'}</td>
          <td>${fornecedorName}</td>
          <td>${dadosLanc.numeroDocumento || '-'}</td>
          <td>${dadosLanc.valor ? formatCurrency(dadosLanc.valor) : '-'}</td>
          <td>${dadosLanc.justificativa || '-'}</td>
          <td>${dadosLanc.tipoDocumento || '-'}</td>
          <td>${dadosLanc.formaPagamento || dadosLanc.forma_pagamento || '-'}</td>
          <td>${centroName}</td>
          <td>${projetoName}</td>
          <td>${dadosLanc.email || '-'}</td>
          <td>${lanc.created_at ? formatDateTime(lanc.created_at) : '-'}</td>
          <td>${lanc.created_by || '-'}</td>
          <td>${lanc.updated_at ? formatDateTime(lanc.updated_at) : '-'}</td>
          <td>${lanc.updated_by || '-'}</td>
        `;
        tbody.appendChild(tr);
      });

      initializeDataTable();
      hideLoading();
    } catch (error) {
      console.error("Erro ao carregar lançamentos completos:", error);
      document.getElementById('lancamentos-tbody').innerHTML = '<tr><td colspan="19">Erro ao carregar os dados.</td></tr>';
      hideLoading();
    }
  }

  // Aguarda a autenticação do usuário para carregar os dados
  AuthService.onAuthChange((user) => {
    if (user) {
      loadLancamentosCompleto();
    } else {
      content.innerHTML = `
        <div class="container-fluid">
          <div class="alert alert-warning text-center mt-4">
            Usuário não autenticado. Por favor, faça login.
          </div>
        </div>
      `;
    }
  });
}

// Registra a rota para a página de "Relatório - Lançamentos Completo"
registerRoute('#lancamentos-completo', renderFinanceiroLancamentosCompleto);