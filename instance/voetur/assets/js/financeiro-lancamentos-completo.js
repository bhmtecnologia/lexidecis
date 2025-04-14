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

export async function renderFinanceiroLancamentosCompleto() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Conteiner com rolagem para manter o rodapé sempre visível -->
      <div class="content-scroll" style="overflow-y: auto; overflow-x: hidden; max-height: calc(100vh - 150px);">
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
                  <th>Inclusão</th>
                  <th>Emissão</th>
                  <th>Venc.</th>
                  <th>Fornecedor</th>
                  <th>Documento</th>
                  <th>Valor</th>
                  <th>Just.</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Centro</th>
                  <th>Projeto</th>
                  <th>Email</th>
                  <th>Data Criação</th>
                  <th>Usuário Criação</th>
                  <th>Alteração</th>
                  <th>Usuário Alteração</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Carrega os dados de mapeamento necessários (filiais, fornecedores, projetos, centros de custo)
  try {
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
  } catch (error) {
    console.error("Erro ao carregar os dados de mapeamento:", error);
    content.innerHTML = `<div class="container-fluid">
      <div class="alert alert-warning text-center mt-4">
        Erro ao carregar os dados de mapeamento. Tente novamente.
      </div>
    </div>`;
    return;
  }

  // Inicializa o DataTable usando a propriedade AJAX e nova estrutura de 'dom'
  var table = $("#lancamentosTable").DataTable({
    processing: true, // Exibe o overlay de processamento integrado
    responsive: true,
    autoWidth: false,
    ordering: true,
    order: [[15, "desc"]], // Ordena pela coluna "Data Criação" (índice 15)
    colReorder: true,
    paging: true,
    pageLength: 5,
    lengthMenu: [[5, 25, 50, -1], [5, 25, 50, "All"]],
    // Layout DOM: Linha 1: Length menu, filtro e container para filtro de data
    // Linha 2: Botões de exportação
    // Linha 3: Tabela
    // Linha 4: Informação e paginação
    dom: "<'row'<'col-sm-4'l><'col-sm-4 text-center date-filter'><'col-sm-4'f>>" +
         "<'row'<'col-sm-12'B>>" +
         "<'row'<'col-sm-12't>>" +
         "<'row'<'col-sm-5'i><'col-sm-7'p>>",
    buttons: [
      {
        extend: 'copyHtml5',
        text: 'Copiar',
        action: function ( e, dt, button, config ) {
          $.fn.dataTable.ext.buttons.copyHtml5.action.call(this, e, dt, button, config);
          alert('Dados copiados com sucesso!');
        }
      },
      {
        extend: 'excelHtml5',
        text: 'Excel',
        action: function ( e, dt, button, config ) {
          $.fn.dataTable.ext.buttons.excelHtml5.action.call(this, e, dt, button, config);
          alert('Arquivo Excel gerado com sucesso!');
        }
      },
      {
        extend: 'csvHtml5',
        text: 'CSV',
        action: function ( e, dt, button, config ) {
          $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
          alert('Arquivo CSV gerado com sucesso!');
        }
      },
      {
        // Botão PDF com as opções solicitadas e redução do tamanho da tabela via customize
        extend: 'pdfHtml5',
        text: 'PDF',
        title: 'Relatório Financeiro',                     // Define o título do PDF
        orientation: 'landscape',                         // Define a orientação como paisagem
        message: 'Impresso por ' + 
                 (AuthService.user && AuthService.user.email ? AuthService.user.email : 'usuário') +
                 ' em ' + new Date().toLocaleString('pt-BR'), // Define a mensagem de impressão
        customize: function(doc) {
          // Reduz o tamanho da fonte geral e dos cabeçalhos para "encolher" a tabela
          doc.defaultStyle.fontSize = 8;
          if (doc.styles.tableHeader) {
            doc.styles.tableHeader.fontSize = 8;
          }
          // Você pode ajustar também as margens da página, se necessário
          doc.pageMargins = [20, 20, 20, 20];
          // Ajusta as larguras das colunas para distribuir de forma mais compacta
          if (doc.content[1] && doc.content[1].table) {
            var colCount = doc.content[1].table.body[0].length;
            doc.content[1].table.widths = Array(colCount).fill('*');
          }
        },
        action: function ( e, dt, button, config ) {
          $.fn.dataTable.ext.buttons.pdfHtml5.action.call(this, e, dt, button, config);
          alert('Arquivo PDF gerado com sucesso!');
        }
      },
      'colvis'
    ],
    language: {
      url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json"
    },
    ajax: function(data, callback, settings) {
      loadLancamentosNoCache()
        .then(dados => {
          // Processa cada lançamento para aplicar a formatação e mapeamento desejados
          const processedData = dados.map(lanc => {
            const dadosLanc = lanc.dados || {};
            const filialObj = window.filiaisData.find(f => f.uuid === dadosLanc.filial);
            const filialName = filialObj ? filialObj.nome : dadosLanc.filial || '-';
            const fornecedorObj = window.fornecedoresData.find(f => f.uuid === dadosLanc.fornecedor);
            const fornecedorName = fornecedorObj ? fornecedorObj.nome : dadosLanc.fornecedor || '-';
            const centroObj = window.centrosData.find(c => c.uuid === dadosLanc.centro_custo);
            const centroName = centroObj ? centroObj.nome : dadosLanc.centro_custo || '-';
            const projetoObj = window.projetosData.find(p => p.uuid === dadosLanc.projeto);
            const projetoName = projetoObj ? projetoObj.nome : dadosLanc.projeto || '-';
            
            return {
              status: dadosLanc.status || '-',
              anexos: formatAnexos(lanc.anexos),
              filial: filialName,
              inclusao: lanc.created_at ? formatDateTime(lanc.created_at) : '-',
              emissao: dadosLanc.dataEmissao ? formatDate(dadosLanc.dataEmissao) : '-',
              vencimento: dadosLanc.vencimento ? formatDate(dadosLanc.vencimento) : '-',
              fornecedor: fornecedorName,
              documento: dadosLanc.numeroDocumento || '-',
              valor: dadosLanc.valor ? formatCurrency(dadosLanc.valor) : '-',
              justificativa: dadosLanc.justificativa || '-',
              tipoDocumento: dadosLanc.tipoDocumento || '-',
              formaPagamento: dadosLanc.formaPagamento || dadosLanc.forma_pagamento || '-',
              centroCusto: centroName,
              projeto: projetoName,
              email: dadosLanc.email || '-',
              dataCriacao: lanc.created_at ? formatDateTime(lanc.created_at) : '-',
              usuarioCriacao: lanc.created_by || '-',
              dataAlteracao: lanc.updated_at ? formatDateTime(lanc.updated_at) : '-',
              usuarioAlteracao: lanc.updated_by || '-'
            };
          });
          callback({ data: processedData });
        })
        .catch(error => {
          console.error("Erro ao carregar os lançamentos:", error);
        });
    },
    columns: [
      { data: "status" },
      { data: "anexos" },
      { data: "filial" },
      { data: "inclusao" },
      { data: "emissao" },
      { data: "vencimento" },
      { data: "fornecedor" },
      { data: "documento" },
      { data: "valor" },
      { data: "justificativa" },
      { data: "tipoDocumento" },
      { data: "formaPagamento" },
      { data: "centroCusto" },
      { data: "projeto" },
      { data: "email" },
      { data: "dataCriacao" },
      { data: "usuarioCriacao" },
      { data: "dataAlteracao" },
      { data: "usuarioAlteracao" }
    ],
    createdRow: function(row, data, dataIndex) {
      $(row).addClass('dataRow');
    }
  });

  // Preenche o container para filtro por data no DOM
  $('.date-filter').html('Filtrar por data (Inclusão): De <input type="date" id="startDate"> até <input type="date" id="endDate">');

  // Registra evento para atualizar o filtro de data
  $('#startDate, #endDate').on('change', function() {
    table.draw();
  });

  // Registra o filtro customizado para a coluna "Inclusão" (índice 3)
  $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
    const min = $('#startDate').val();
    const max = $('#endDate').val();
    const dateStr = data[3]; // "Inclusão" (expectativa: data formatada pelo formatDateTime)
    if (!min && !max) {
      return true;
    }
    if (dateStr === '-' || dateStr.trim() === '') {
      return true;
    }
    const date = new Date(dateStr);
    if (min) {
      const minDate = new Date(min);
      if (date < minDate) return false;
    }
    if (max) {
      const maxDate = new Date(max);
      if (date > maxDate) return false;
    }
    return true;
  });
}

// Registra a rota para a página de "Relatório - Lançamentos Completo"
registerRoute('#lancamentos-completo', renderFinanceiroLancamentosCompleto);