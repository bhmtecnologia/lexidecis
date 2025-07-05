/**
 * Módulo DOM para a aplicação Lexidecis.
 * 
 * Responsável por renderizar a interface principal, gerenciar a tabela de usuários,
 * controlar o overlay de carregamento e popular os selects de units e companies.
 *
 * @module dom
 */

console.log("dom.js carregado");

/**
 * Renderiza o conteúdo principal da aplicação.
 * Injeta o HTML da interface no elemento com id "content".
 */
export function renderContent() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <div class="page-title d-flex justify-content-between align-items-center">
        <div>
          <h2>Administração de Usuários - Lexidecis</h2>
          <p class="mb-0 text-title-gray">Lista de usuários cadastrados</p>
        </div>
        <div>
          <button id="btnNewUser" class="btn btn-success">
            <i class="bi bi-plus-circle"></i> Novo Usuário
          </button>
        </div>
      </div>
      <ol class="breadcrumb mt-2">
        <li class="breadcrumb-item"><a href="index.html"><i class="bi bi-house-fill"></i></a></li>
        <li class="breadcrumb-item">Administração</li>
        <li class="breadcrumb-item active">Usuários Lexidecis</li>
      </ol>
      <div id="protected-section" class="mt-4 d-none">
        <div id="report-container" class="position-relative">
          <div class="card">
            <div class="card-body">
              <div class="table-responsive">
                <table id="data-table" class="display table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>ID</th>
                      <th>É Admin</th>
                      <th>Company</th>
                      <th>Unit</th>
                      <th>Remote JID</th>
                      <th>Whatsapp</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>
          <div id="report-overlay" class="d-none position-absolute top-0 start-0 w-100 h-100 bg-light bg-opacity-75 d-flex align-items-center justify-content-center" style="z-index: 1000;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inicializa o DataTable para a tabela de usuários.
 * Se o DataTable já estiver inicializado, a função não faz nada.
 */
export function initializeDataTable() {
  if (window.jQuery && jQuery.fn.DataTable) {
    if ($.fn.DataTable.isDataTable("#data-table")) return;
    $("#data-table").DataTable({
      responsive: true,
      autoWidth: false,
      ordering: true,
      paging: true,
      dom: 'lBfrtip',
      buttons: ['copy', 'excel', 'csv', 'pdf'],
      language: { url: "https://cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json" }
    });
  } else {
    console.error("DataTables não está carregado.");
  }
}

/**
 * Atualiza a tabela de usuários com os dados fornecidos.
 *
 * @param {Array} users - Array de objetos representando os usuários.
 * @param {Object} usersDataObj - Objeto para armazenar os dados dos usuários mapeados pelo ID.
 */
export function updateUserTable(users, usersDataObj) {
  if ($.fn.DataTable.isDataTable("#data-table")) {
    const dt = $("#data-table").DataTable();
    dt.clear();
    const rows = users.map(user => {
      if (user.id) usersDataObj[user.id] = user;
      const actions = `
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
            <i class="bi bi-pencil-square"></i> Editar
          </button>
          <button class="btn btn-sm btn-danger" onclick="removeUser('${user.id}')">
            <i class="bi bi-trash"></i> Remover
          </button>
        </div>
      `;
      return [
        user.username || '-',
        user.email || '-',
        user.id || '-',
        (typeof user.is_admin === 'boolean') ? (user.is_admin ? 'Sim' : 'Não') : '-',
        user.company_name || '-',
        user.unit_name || '-',
        (user.remote_jid !== undefined && user.remote_jid !== null) ? user.remote_jid : '-',
        (typeof user.whatsapp === 'boolean') ? (user.whatsapp ? 'Sim' : 'Não') : '-',
        actions
      ];
    });
    dt.rows.add(rows).draw();
  } else {
    const tableBody = $("#data-table tbody");
    tableBody.empty();
    users.forEach(user => {
      if (user.id) usersDataObj[user.id] = user;
      tableBody.append(`
        <tr>
          <td>${user.username || '-'}</td>
          <td>${user.email || '-'}</td>
          <td>${user.id || '-'}</td>
          <td>${(typeof user.is_admin === 'boolean') ? (user.is_admin ? 'Sim' : 'Não') : '-'}</td>
          <td>${user.company_name || '-'}</td>
          <td>${user.unit_name || '-'}</td>
          <td>${(user.remote_jid !== undefined && user.remote_jid !== null) ? user.remote_jid : '-'}</td>
          <td>${(typeof user.whatsapp === 'boolean') ? (user.whatsapp ? 'Sim' : 'Não') : '-'}</td>
          <td>
            <div class="btn-group" role="group">
              <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                <i class="bi bi-pencil-square"></i> Editar
              </button>
              <button class="btn btn-sm btn-danger" onclick="removeUser('${user.id}')">
                <i class="bi bi-trash"></i> Remover
              </button>
            </div>
          </td>
        </tr>
      `);
    });
    initializeDataTable();
  }
}

/**
 * Exibe o overlay de carregamento.
 */
export function showOverlay() {
  const overlay = document.getElementById('report-overlay');
  if (overlay) overlay.classList.remove('d-none');
}

/**
 * Oculta o overlay de carregamento.
 */
export function hideOverlay() {
  const overlay = document.getElementById('report-overlay');
  if (overlay) overlay.classList.add('d-none');
}

/**
 * Popula o select de units.
 * 
 * Este método adiciona um placeholder ("Selecione uma unit") e, em seguida,
 * percorre a lista de units para inserir as opções. Se um valor atual (currentId)
 * for fornecido e encontrado na lista, essa opção é marcada como selecionada.
 * Se não for encontrado, a opção com o currentId é adicionada manualmente com o currentName.
 *
 * @param {string} selectId - ID do elemento select.
 * @param {Array|Object} units - Dados das units (array ou objeto único).
 * @param {string} [currentId=""] - ID da unit atualmente selecionada.
 * @param {string} [currentName=""] - Nome da unit atualmente selecionada (usado caso não seja encontrado na lista).
 */
export function populateUnitsSelect(selectId, units, currentId = "", currentName = "") {
  const select = document.getElementById(selectId);
  let html = `<option value="">Selecione uma unit</option>`;
  let found = false;
  if (Array.isArray(units)) {
    units.forEach(unit => {
      if (unit.id === currentId) found = true;
      html += `<option value="${unit.id}" ${unit.id === currentId ? "selected" : ""}>${unit.name}</option>`;
    });
  } else {
    found = (units.id === currentId);
    html += `<option value="${units.id}" ${units.id === currentId ? "selected" : ""}>${units.name}</option>`;
  }
  if (currentId && !found) {
    // Se o currentId não for encontrado na lista, adiciona manualmente a opção
    html = `<option value="${currentId}" selected>${currentName || "Unidade Desconhecida"}</option>` + html;
  }
  select.innerHTML = html;
}

/**
 * Popula o select de companies.
 * 
 * Este método adiciona um placeholder ("Selecione uma company") e, em seguida,
 * percorre a lista de companies para inserir as opções. Se um valor atual (currentId)
 * for fornecido e encontrado na lista, essa opção é marcada como selecionada.
 * Se não for encontrado, a opção com o currentId é adicionada manualmente com o currentName.
 *
 * @param {string} selectId - ID do elemento select.
 * @param {Array|Object} companies - Dados das companies (array ou objeto único).
 * @param {string} [currentId=""] - ID da company atualmente selecionada.
 * @param {string} [currentName=""] - Nome da company atualmente selecionada (usado caso não seja encontrado na lista).
 */
export function populateCompaniesSelect(selectId, companies, currentId = "", currentName = "") {
  const select = document.getElementById(selectId);
  let html = `<option value="">Selecione uma company</option>`;
  let found = false;
  if (Array.isArray(companies)) {
    companies.forEach(company => {
      if (company.id === currentId) found = true;
      html += `<option value="${company.id}" ${company.id === currentId ? "selected" : ""}>${company.name}</option>`;
    });
  } else {
    found = (companies.id === currentId);
    html += `<option value="${companies.id}" ${companies.id === currentId ? "selected" : ""}>${companies.name}</option>`;
  }
  if (currentId && !found) {
    html = `<option value="${currentId}" selected>${currentName || "Company Desconhecida"}</option>` + html;
  }
  select.innerHTML = html;
}