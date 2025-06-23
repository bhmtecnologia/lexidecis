/**
 * @file vtc-financeiro-lancamento-create-v6.js
 * @description Versão v6 da página de "Financeiro - Lançamento Create", permite criação de lançamentos via formulário e envia os dados para a API v6.
 * Campos: Filial, Fornecedor, Conta Financeira, Centro de Custo, Projeto, N° Documento, Tipo de Documento,
 * Data de Emissão, Valor Bruto, Forma de Pagamento, Vencimento, Justificativa e Anexo(s).
 *
 */

import { showAlert } from "./alerts.js";
import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import {
  createLancamento,
  uploadArquivo,
  listCentrosCustos,
  listProjetos,
  listFiliais,
  listFornecedores
} from "./api.js";

// Função centralizada para tratamento de erros
function handleError(error, context = "Erro") {
  console.error("[" + context + "]", error);
  return error.message || "Ocorreu um erro inesperado";
}

// Formata Date para "yyyy-mm-dd hh:mm:ss"
function formatDateISO(dateObj) {
  const pad = num => num.toString().padStart(2, "0");
  const Y = dateObj.getFullYear();
  const M = pad(dateObj.getMonth() + 1);
  const D = pad(dateObj.getDate());
  const h = pad(dateObj.getHours());
  const m = pad(dateObj.getMinutes());
  const s = pad(dateObj.getSeconds());
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

// Reseta campos do formulário
// Adiciona: updateParcelaRemoveButtons e updateItemRemoveButtons após manipulação de linhas
function resetFormFields() {
  const padBlankSelect = selectId => {
    const el = document.getElementById(selectId);
    el.value = "";
    el.disabled = false;
    if (window.$ && $.fn.select2) {
      $(`#${selectId}`).val(null).trigger("change");
    }
  };

  // Filial
  const filSelect = document.getElementById("filialSelect");
  if (window.filiaisData && window.filiaisData.length === 1) {
    filSelect.value = window.filiaisData[0].nome;
    filSelect.disabled = true;
    if (window.$ && $.fn.select2) {
      $("#filialSelect").val(window.filiaisData[0].nome).trigger("change");
    }
  } else padBlankSelect("filialSelect");

  // Fornecedor
  padBlankSelect("fornecedorSelect");
  // Recarrega opções de Fornecedor a partir dos dados já carregados
  const fornecedorSelect = document.getElementById("fornecedorSelect");
  if (fornecedorSelect && window.fornecedoresData) {
    fornecedorSelect.innerHTML = '<option value="">Selecione</option>';
    window.fornecedoresData.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.uuid || f.id;
      opt.text = `${f.nome} (${f.cnpj})`;
      fornecedorSelect.add(opt);
    });
    // Atualiza Select2, se ativo
    if (window.$ && $.fn.select2) {
      $("#fornecedorSelect").trigger("change");
    }
  }

  // Centro de Custo
  // Removido reset do Centro de Custo para manter valor selecionado entre lançamentos
  // const ctrSelect = document.getElementById("centroCustoSelect");
  // if (window.centrosData && window.centrosData.length === 1) {
  //   ctrSelect.value = window.centrosData[0].nome;
  //   ctrSelect.disabled = true;
  //   if (window.$ && $.fn.select2) {
  //     $("#centroCustoSelect").val(window.centrosData[0].nome).trigger("change");
  //   }
  // } else padBlankSelect("centroCustoSelect");

  // Projeto (sempre vazio)
  padBlankSelect("projetoSelect");

  // Inputs padrões
  document.getElementById("numeroDocumento").value = "";
  document.getElementById("tipoDocumento").value = "";
  document.getElementById("dataEmissao").value = new Date().toISOString().split("T")[0];
  // Preenche Data de Vencimento = Data Emissão + 7 dias
  const emis = new Date(document.getElementById("dataEmissao").value);
  emis.setDate(emis.getDate() + 7);
  document.getElementById("dataVencimento").value = emis.toISOString().split("T")[0];
  document.getElementById("valor").value = "";
  // document.getElementById("formaPagamento").value = "";
  document.getElementById("formaPagamento").value = "deposito";
  document.getElementById("justificativa").value = "";
  document.getElementById("arquivo").value = "";
}

export async function renderFinanceiroLancamentoCreatev6() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <style>
      @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      .loader-text {
        font-family: var(--font-family, "Inter", sans-serif);
        font-size: 1.2rem;
        margin-top: 1rem;
        animation: pulse 1.5s ease-in-out infinite;
        color: var(--body-font-color);
      }
      #loadingOverlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: var(--overlay-background, rgba(0,0,0,0.05));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1050;
      }
      .skeleton-rect {
        width: 80%;
        height: 1rem;
        background: var(--skeleton-bg, rgba(0,0,0,0.05));
        margin: 0.5rem 0;
        border-radius: 4px;
        animation: pulse 1.5s ease-in-out infinite;
      }
      .dropzone {
        width: 100%;
        min-height: 150px;
        border: 2px dashed var(--border-color);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 1rem;
        color: var(--body-font-color);
        background: var(--overlay-background, rgba(0,0,0,0.05));
        transition: background 0.3s, border-color 0.3s;
      }
      .dropzone-hover {
        background: var(--overlay-hover, rgba(0,0,0,0.1));
        border-color: var(--theme-primary);
      }
      .dropzone p {
        margin: 0;
      }
      .dropzone span {
        text-decoration: underline;
        cursor: pointer;
      }
      /* Permite quebra de linha em células de tabela responsiva */
      .table-responsive td {
        white-space: normal !important;
        word-break: break-word !important;
      }
      /* Aumenta a largura mínima da coluna de descrição */
      #itensTable th:first-child,
      #itensTable td:first-child {
        min-width: 150px;
      }
    </style>
    <div class="container-fluid" style="background-color: var(--body-color); color: var(--body-font-color);" aria-busy="false">
      <!-- Loading Overlay -->
      <div id="loadingOverlay" class="d-none">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="skeleton-rect"></div>
        <div class="skeleton-rect" style="width: 60%;"></div>
        <div class="skeleton-rect" style="width: 40%;"></div>
        <div class="loader-text">Classificando documento...</div>
      </div>
      <div class="page-title" style="padding: 1rem;">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2 style="color: var(--black);">Financeiro - Lançamento Create v6</h2>
            <p class="mb-0" style="color: var(--black);">Crie e gerencie novos lançamentos de pagamento (v6)</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb" style="color: var(--theme-default);">
              <li class="breadcrumb-item"><a href="index.html" style="color: var(--theme-default);"><i class="iconly-Home icli svg-color"></i></a></li>
              <li class="breadcrumb-item" style="color: var(--theme-default);">Financeiro</li>
              <li class="breadcrumb-item active" style="color: var(--theme-default);">Lançamento Create v6</li>
            </ol>
          </div>
        </div>
      </div>
      <div id="classification-section" class="mt-4">
        <div class="card" style="border:1px solid var(--border-color);background:var(--white);color:var(--black);">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h3 class="mb-0" style="color: var(--black);">Classifique o Documento</h3>
              <button type="button" id="backBtnClassify" class="btn btn-outline-secondary btn-sm">Voltar</button>
            </div>
            <div class="mb-3">
              <label class="form-label">Upload do Documento <span style="color:red">*</span></label>
              <div id="dropZone" class="dropzone">
                <p>Arraste e solte o arquivo aqui ou <span id="browseBtn">toque para selecionar</span></p>
                <input type="file" id="arquivoClassify" accept="image/png,image/jpeg" class="d-none">
              </div>
              <small class="form-text text-muted">PNG/JPEG. Tamanho máximo 4MB.</small>
              <small class="form-text text-danger">Apenas documentos do tipo Nota Fiscal ou Conta a pagar são aceitos.</small>
            </div>
            <div id="classificationError" class="text-danger"></div>
            <pre id="classificationResult" class="mt-2" style="background:#f8f9fa; padding:1rem; white-space: pre-wrap;"></pre>
          </div>
        </div>
      </div>
      <div id="supplier-registration-section" class="mt-4 d-none">
        <div class="card" style="border:1px solid var(--border-color);background:var(--white);color:var(--black);">
          <div class="card-body">
            <h3 style="color: var(--black);">Fornecedor não encontrado</h3>
            <p>Solicite o cadastro do fornecedor abaixo:</p>
            <form id="supplierRegisterForm">
              <div class="mb-3">
                <label for="supNome" class="form-label">Nome do Fornecedor</label>
                <input type="text" class="form-control" id="supNome" required>
              </div>
              <div class="mb-3">
                <label for="supCnpj" class="form-label">CNPJ</label>
                <input type="text" class="form-control" id="supCnpj" required>
              </div>
              <button type="button" id="btnSolicitarCadastro" class="btn btn-warning">Solicitar Cadastro</button>
            </form>
          </div>
        </div>
      </div>
      <div id="form-section" class="mt-4 d-none">
        <div class="card" style="border:1px solid var(--border-color);background:var(--white);color:var(--black);">
          <div class="card-body">
            <form id="lancamentoForm">
              <div id="wizardIndicator" class="mb-3 text-center"><strong>Etapa 1 de 3</strong></div>
              <!-- Anexo Link -->
              <div id="attachmentLink" class="mb-3"></div>
              <!-- Step 1 -->
              <div class="wizard-step" data-step="1">
                <!-- Log de Ações -->
                <div class="mb-3">
                  <label for="logField" class="form-label">Log</label>
                  <textarea class="form-control" id="logField" rows="5" readonly style="font-size:0.85em;"></textarea>
                </div>
                <!-- Mesmos campos da v2... -->
                <!-- Tipo de Documento -->
                <div class="mb-3">
                  <label for="tipoDocumento" class="form-label">Tipo de Documento <span style="color:red">*</span></label>
                  <select class="form-select" id="tipoDocumento" required>
                    <option value="">Selecione</option>
                    <option value="Nota Fiscal">Nota Fiscal</option>
                    <option value="Conta a pagar">Conta a pagar</option>
                    <option value="Fatura">Fatura</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Reembolso">Reembolso</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <!-- Filial -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <label for="filialSelect" class="form-label" data-bs-toggle="tooltip" title="Selecione a filial que contratou o serviço">Filial <span style="color:red">*</span></label>
                    <div class="form-check form-switch mb-0">
                      <input class="form-check-input" type="checkbox" id="unlockFilial">
                      <label class="form-check-label" for="unlockFilial">Manual</label>
                    </div>
                  </div>
                  <select class="form-control" id="filialSelect" required><option value="">Selecione</option></select>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <!-- Centro de Custo -->
                    <label for="centroCustoSelect" class="form-label" data-bs-toggle="tooltip" title="Selecione o centro de custo correspondente a este lançamento">Centro de Custo <span class="text-danger">*</span></label>
                    <select class="form-control" id="centroCustoSelect" required><option value="">Selecione</option></select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <!-- Projeto -->
                    <label for="projetoSelect" class="form-label" data-bs-toggle="tooltip" title="Selecione o projeto associado, se houver">Projeto</label>
                    <select class="form-control" id="projetoSelect"><option value="">Selecione</option></select>
                  </div>
                </div>
              </div>
              <div class="d-flex justify-content-between mt-3 step1-nav">
                <button type="button" id="cancelBtn" class="btn btn-secondary">Cancelar</button>
                <button type="button" id="wizardNext" class="btn btn-primary">Próximo</button>
              </div>
              <!-- Step 2 -->
              <div class="wizard-step" data-step="2">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <!-- Fornecedor -->
                    <div class="d-flex justify-content-between align-items-center">
                      <label for="fornecedorSelect" class="form-label" data-bs-toggle="tooltip" title="Selecione ou insira o fornecedor registrado no sistema">Fornecedor <span class="text-danger">*</span></label>
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="unlockFornecedor">
                        <label class="form-check-label" for="unlockFornecedor">Manual</label>
                      </div>
                    </div>
                    <select class="form-control" id="fornecedorSelect" required><option value="">Selecione</option></select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <!-- Forma de Pagamento -->
                    <label for="formaPagamento" class="form-label">Forma de Pagamento <span class="text-danger">*</span></label>
                    <select class="form-select" id="formaPagamento" required>
                      <option value="">Selecione</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Pix">Pix</option>
                      <option value="deposito" selected>Depósito</option>
                    </select>
                  </div>
                </div>
                <!-- Número do Documento, Valor Bruto, Data de Emissão, Data de Vencimento -->
                <div class="row">
                  <div class="col-md-3 mb-3">
                    <!-- Número do Documento -->
                    <div class="d-flex justify-content-between align-items-center">
                      <label for="numeroDocumento" class="form-label" data-bs-toggle="tooltip" title="Número do documento fiscal ou referência">N° Documento <span class="text-danger">*</span></label>
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="unlockNumero">
                        <label class="form-check-label" for="unlockNumero">Manual</label>
                      </div>
                    </div>
                    <input type="text" class="form-control" id="numeroDocumento" required placeholder="Digite o número do documento">
                  </div>
                  <div class="col-md-3 mb-3">
                    <!-- Valor Bruto -->
                    <div class="d-flex justify-content-between align-items-center">
                      <label for="valor" class="form-label" data-bs-toggle="tooltip" title="Valor total bruto do documento">Valor Bruto <span class="text-danger">*</span></label>
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="unlockValor">
                        <label class="form-check-label" for="unlockValor">Manual</label>
                      </div>
                    </div>
                    <input type="text" class="form-control" id="valor" required placeholder="0,00">
                  </div>
                  <div class="col-md-3 mb-3">
                    <!-- Data de Emissão -->
                    <div class="d-flex justify-content-between align-items-center">
                      <label for="dataEmissao" class="form-label" data-bs-toggle="tooltip" title="Data de emissão do documento">Data de Emissão <span class="text-danger">*</span></label>
                      <div class="form-check form-switch mb-0">
                        <input class="form-check-input" type="checkbox" id="unlockData">
                        <label class="form-check-label" for="unlockData">Manual</label>
                      </div>
                    </div>
                    <input type="date" class="form-control" id="dataEmissao" required>
                    <small class="form-text text-muted">Não pode ser superior à data atual.</small>
                  </div>
                  <div class="col-md-3 mb-3">
                    <!-- Data de Vencimento -->
                    <label for="dataVencimento" class="form-label">Data de Vencimento <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" id="dataVencimento" required>
                  </div>
                </div>
                <!-- Anexo(s) -->
                <div class="mb-3">
                  <label for="arquivo" class="form-label">Inserir Anexo(s)</label>
                  <input type="file" class="form-control" id="arquivo" accept="image/*" capture="environment" multiple>
                  <small class="form-text text-muted">Máx. 3 anexos; 4MB por arquivo. PNG/JPEG.</small>
                </div>
                <!-- Justificativa -->
                <div class="mb-3">
                  <label for="justificativa" class="form-label">Justificativa <span style="color:red">*</span></label>
                  <textarea class="form-control" id="justificativa" rows="3" required placeholder="Justifique o lançamento conforme PR-001."></textarea>
                </div>
                <div class="d-flex justify-content-between mt-3">
                  <button type="button" id="wizardPrev" class="btn btn-secondary">Anterior</button>
                  <button type="button" id="wizardNext" class="btn btn-primary">Próximo</button>
                </div>
              </div>
            <div id="formError" class="mt-2 text-danger" role="alert"></div>
            <!-- Step 3: Revisão (read-only) -->
            <div class="wizard-step" data-step="3">
              <h3 class="mb-3">Revisão do Lançamento</h3>
              <div id="reviewSection" class="card" style="border:1px solid var(--border-color);background:var(--white);color:var(--black); padding:1rem;">
                <!-- Será preenchido via JS -->
              </div>
              <div class="d-flex justify-content-between mt-3">
                <button type="button" id="wizardPrev" class="btn btn-secondary">Anterior</button>
                <button type="submit" id="wizardNext" class="btn btn-primary">Finalizar</button>
              </div>
            </div>
            </form>
            <!-- Preview do Anexo em Card -->
            <div class="card mt-4" style="border:1px solid var(--border-color);background:var(--white);color:var(--black);">
              <div class="card-body">
                <label class="form-label">Preview do Anexo</label>
                <div id="attachmentPreview" class="mb-3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!--  -->
  `;


  // Loader animation logic for progress bar (indeterminate)
  function startLoaderAnimation() {
    const bar = document.getElementById("loaderBar");
    if (bar) {
      // Indeterminate progress: full width with stripe animation
      bar.style.width = "100%";
    }
  }
  function stopLoaderAnimation() {
    const bar = document.getElementById("loaderBar");
    if (bar) {
      bar.style.width = "0%";
    }
  }

  // Exibe overlay de carregamento com mensagem customizada
  function showLoadingOverlay(message = "Carregando...") {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      const text = overlay.querySelector(".loader-text");
      if (text) text.textContent = message;
      overlay.classList.remove("d-none");
    }
    const container = document.querySelector(".container-fluid");
    if (container) container.setAttribute("aria-busy", "true");
    startLoaderAnimation();
  }

  // Oculta overlay de carregamento
  function hideLoadingOverlay() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("d-none");
    const container = document.querySelector(".container-fluid");
    if (container) container.setAttribute("aria-busy", "false");
    stopLoaderAnimation();
  }

  // Armazena entradas de log
  window.logEntries = [];
  function addLog(entry) {
    const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    window.logEntries.unshift(`${timestamp} - ${entry}`);
    const logEl = document.getElementById("logField");
    if (logEl) logEl.value = window.logEntries.join("\n");
  }

  // Inicializa Select2
  if (window.$ && $.fn.select2) {
    $("#filialSelect").select2({ placeholder: "Selecione uma filial", width: "100%" });
    $("#fornecedorSelect").select2({ placeholder: "Selecione um fornecedor", width: "100%", minimumInputLength: 3, allowClear: true });
    $("#centroCustoSelect").select2({ placeholder: "Selecione um centro de custo", width: "100%" });
    $("#projetoSelect").select2({ placeholder: "Selecione um projeto", allowClear: true, width: "100%" });
  }

  // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));

  // Preenche a seção de revisão com os valores atuais do form em modo leitura
  function buildReview() {
    const review = document.getElementById("reviewSection");
    if (!review) return;
    review.innerHTML = "";
    const mappings = [
      { id: "tipoDocumento", label: "Tipo de Documento" },
      { id: "filialSelect", label: "Filial" },
      { id: "fornecedorSelect", label: "Fornecedor" },
      { id: "numeroDocumento", label: "N° Documento" },
      { id: "valor", label: "Valor Bruto" },
      { id: "dataEmissao", label: "Data de Emissão" },
      { id: "formaPagamento", label: "Forma de Pagamento" },
      { id: "centroCustoSelect", label: "Centro de Custo" },
      { id: "projetoSelect", label: "Projeto" },
      { id: "justificativa", label: "Justificativa" }
    ];
    mappings.forEach(m => {
      const el = document.getElementById(m.id);
      if (el) {
        const text = el.tagName === "SELECT"
          ? el.options[el.selectedIndex]?.text || ""
          : el.value || "";
        const div = document.createElement("div");
        div.className = "mb-2";
        div.innerHTML = `<strong>${m.label}:</strong> <span>${text}</span>`;
        review.appendChild(div);
      }
    });
  }

  // Wizard step logic
  const wizardSteps = Array.from(document.querySelectorAll('.wizard-step'));
  let currentStep = 0;

  // Step 1 validation helper
  function validateStep1() {
    const errors = [];
    const tipo = document.getElementById('tipoDocumento').value;
    const filial = document.getElementById('filialSelect').value;
    if (!tipo) errors.push('Tipo de Documento');
    if (!filial) errors.push('Filial');
    if (errors.length) {
      showAlert(`Preencha os campos obrigatórios: ${errors.join(', ')}`, 'warning');
      return false;
    }
    return true;
  }

  // Step 2 validation helper
  function validateStep2() {
    const errors = [];
    const fornecedorEl = document.getElementById('fornecedorSelect');
    const fornecedor = fornecedorEl.value;
    const forma = document.getElementById('formaPagamento').value;
    const numero = document.getElementById('numeroDocumento').value.trim();
    const valor = document.getElementById('valor').value.trim();
    const data = document.getElementById('dataEmissao').value;
    const justificativa = document.getElementById('justificativa').value.trim();
    if (!fornecedor && !(fornecedorEl.disabled && fornecedorEl.value)) errors.push('Fornecedor');
    if (!forma) errors.push('Forma de Pagamento');
    if (!numero) errors.push('N° Documento');
    if (!valor) errors.push('Valor Bruto');
    if (!data) errors.push('Data de Emissão');
    if (!justificativa) errors.push('Justificativa');
    if (errors.length) {
      showAlert(`Preencha os campos obrigatórios: ${errors.join(', ')}`, 'warning');
      return false;
    }
    return true;
  }

  function showWizardStep(idx) {
    // Scroll to top of form when changing steps
    document.getElementById("content").scrollIntoView({ behavior: "smooth", block: "start" });
    wizardSteps.forEach((el, i) => el.style.display = i === idx ? 'block' : 'none');
    // Show/hide all "Anterior" buttons
    document.querySelectorAll('#wizardPrev').forEach(btn => {
      btn.style.display = idx === 0 ? 'none' : 'inline-block';
    });
    document.getElementById('wizardNext').textContent = idx === wizardSteps.length - 1 ? 'Finalizar' : 'Próximo';
    const indicator = document.getElementById('wizardIndicator');
    if (indicator) indicator.innerHTML = `<strong>Etapa ${idx + 1} de ${wizardSteps.length}</strong>`;

    // Configura comportamento do botão Cancelar/Anterior conforme etapa
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      if (idx === 0) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.onclick = () => { location.hash = "#vtc-financeiro-gestor"; };
      } else {
        // Hide the top navigation button on all other steps
        cancelBtn.style.display = 'none';
      }
    }

    // Show/hide the top navigation "Próximo" (step1-nav) only for step 1
    const topNext = document.querySelector('.step1-nav #wizardNext');
    if (topNext) {
      topNext.style.display = idx === 0 ? 'inline-block' : 'none';
    }
    // Show top nav only for step 1
    const topNav = document.querySelector('form > .step1-nav');
    if (topNav) topNav.style.display = idx === 0 ? 'flex' : 'none';
  }
  // Add event listener to all wizardPrev buttons
  document.querySelectorAll('#wizardPrev').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        showWizardStep(currentStep);
      }
    });
  });
  // Add event listener to all wizardNext buttons
  document.querySelectorAll('#wizardNext').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep < wizardSteps.length - 1) {
        if (currentStep === 0 && !validateStep1()) return;
        if (currentStep === 1 && !validateStep2()) return;
        currentStep++;
        if (currentStep === wizardSteps.length - 1) {
          buildReview();
        }
        showWizardStep(currentStep);
      } else {
        // Last step acts as submit
        document.getElementById('lancamentoForm').requestSubmit();
      }
    });
  });
  // Initialize wizard
  showWizardStep(0);

  // Aplica máscara de moeda no campo Valor Bruto
  const valorInput = document.getElementById("valor");
  if (valorInput) {
    valorInput.addEventListener("input", (e) => {
      // Remove caracteres não numéricos
      let v = e.target.value.replace(/\D/g, "");
      // Converte para número e formata com duas casas decimais
      const numeric = Number(v) / 100;
      e.target.value = numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      // Atualize parcelas para o mesmo valor
      document.querySelectorAll('.parcela-valor').forEach(el => {
        el.value = e.target.value;
      });
    });
  }

  // Aplica máscara de moeda nos campos de valor de parcela e valor unitário de item
  document.addEventListener("input", (e) => {
    if (e.target && (e.target.classList.contains("parcela-valor") || e.target.classList.contains("item-valor-unitario"))) {
      let v = e.target.value.replace(/\D/g, "");
      const numeric = Number(v) / 100;
      e.target.value = numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  });

  // Exibe campo de anexo (sempre visível)
  const formaEl = document.getElementById("formaPagamento");
  if (formaEl) {
    formaEl.addEventListener("change", () => {
      const anexGroup = document.querySelector("#arquivo").closest(".mb-3");
      anexGroup.classList.remove("d-none");
    });
  }

  // Upload imediato dos boletos ao selecionar
  const boletoInput = document.getElementById("arquivo");
  window.boletoUrls = []; // armazena URLs dos uploads
  if (boletoInput) {
    boletoInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 3) {
        showAlert("Você pode anexar no máximo 3 anexos.", "warning");
        e.target.value = "";
        // Desabilita o botão de submit ao tentar selecionar muitos arquivos
        const submitBtn = document.querySelector("#lancamentoForm button[type=submit]");
        if (submitBtn) submitBtn.disabled = true;
        return;
      }
      // Desabilita o botão de submit durante o upload dos boletos
      const submitBtn = document.querySelector("#lancamentoForm button[type=submit]");
      // Exibe status de upload para o usuário
      let statusEl = document.getElementById("uploadStatus");
      if (!statusEl) {
        statusEl = document.createElement("div");
        statusEl.id = "uploadStatus";
        statusEl.className = "form-text text-info mb-3";
        submitBtn.parentElement.insertBefore(statusEl, submitBtn);
      }
      statusEl.textContent = "Upload de anexos em andamento... aguarde.";
      if (submitBtn) submitBtn.disabled = true;
      window.boletoUrls = [];
      // Limpa preview anterior
      let previewEl = document.getElementById("boletoPreview");
      if (previewEl) {
        previewEl.innerHTML = "";
      }
      for (const file of files) {
        let resp = null;
        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            resp = await uploadArquivo(AuthService, file);
            success = true;
            break;
          } catch (err) {
            console.warn(`Tentativa ${attempt} falhou para upload do arquivo:`, err);
            if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
          }
        }
        if (!success) {
          showAlert(`Erro no upload do arquivo "${file.name}". O formulário será reiniciado.`, "danger");
          // Recarrega a tela para recomeçar o processo
          location.hash = "#vtc-financeiro-lancamento-create-v6";
          return;
        }
        const url = resp.filename || resp.url || resp;
        window.boletoUrls.push(url);
        // Registra log de boleto anexado
        addLog(`Boleto anexado: ${url}`);
        // Exibe link de preview de cada boleto
        previewEl = document.getElementById("boletoPreview")
          || (() => {
            const div = document.createElement("div");
            div.id = "boletoPreview";
            document.querySelector("#arquivo").closest(".mb-3").appendChild(div);
            return div;
          })();
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.textContent = file.name;
        previewEl.appendChild(link);
        previewEl.appendChild(document.createElement("br"));
      }
      // Limpa status de upload
      if (statusEl) statusEl.textContent = "";
      // Reabilita o botão criar lançamento após uploads de boleto
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  // Classificação automática ao selecionar anexo (upload inicial)
  const arquivoClassify = document.getElementById("arquivoClassify");
  arquivoClassify.addEventListener("change", async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const classificationError = document.getElementById("classificationError");
    classificationError.innerHTML = "";
    const submitBtn = document.querySelector("#lancamentoForm button[type=submit]");
    showLoadingOverlay("Classificando documento...");
    submitBtn.disabled = true;
    try {
      // Esconde a área de classificação
      document.getElementById("classification-section").classList.add("d-none");
      // Atualiza título da página para criação de lançamento
      const pageTitle = document.querySelector(".page-title h2");
      if (pageTitle) pageTitle.textContent = "Financeiro - Novo Lançamento";
      // Realiza upload e classificação para cada arquivo, com retry de até 3 tentativas e espera de 3s entre elas
      let resultados = [];
      for (const file of files) {
        let resp = null;
        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            resp = await uploadArquivo(AuthService, file, { classify: true });
            success = true;
            break;
          } catch (err) {
            console.warn(`Tentativa ${attempt} falhou na classificação do arquivo:`, err);
            if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
          }
        }
        if (!success) {
          classificationError.innerHTML = `Erro no upload do arquivo "${file.name}". O formulário será reiniciado.`;
          location.hash = "#vtc-financeiro-lancamento-create-v6";
          return;
        }
        resultados.push(resp);
      }
      // Processa o primeiro resultado
      const info = resultados[0];
      // Armazena resultado para submissão
      window.classificationResult = info;
      // Armazena dados de auditoria (extendido)
      window.auditInfo = {
        tipo_documento: info.tipo_documento,
        url_anexo: info.filename,
        nome_anexo: files[0].name,
        status_imagem: info.status_imagem,
        usuario: AuthService.user.email,
        data_hora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      };
      // Preenche campo de log no form de forma humanizada (extendido)
      const logEl = document.getElementById("logField");
      if (logEl) {
        logEl.value =
          `Status da Imagem: ${window.auditInfo.status_imagem || '-'}\n` +
          `Tipo de Documento: ${window.auditInfo.tipo_documento || '-'}\n` +
          `URL do Anexo: ${window.auditInfo.url_anexo || '-'}\n` +
          `Nome do Arquivo: ${window.auditInfo.nome_anexo || '-'}\n` +
          `Usuário: ${window.auditInfo.usuario || '-'}\n` +
          `Data/Hora: ${window.auditInfo.data_hora || '-'}`;
      }
      // Adiciona log de classificação
      addLog(`Documento classificado como ${info.tipo_documento}`);
      // Log do retorno cru da API de classificação
      addLog(`Retorno da API: ${JSON.stringify(info)}`);
      // Log do link do anexo em linha separada
      if (info.filename) {
        addLog(`Anexo: ${info.filename}`);
      }
      // Insere ações de anexo no topo do form
      const attachmentEl = document.getElementById("attachmentLink");
      if (attachmentEl && info.filename) {
        attachmentEl.innerHTML = `
          <label class="form-label">Anexo</label>
          <div class="d-flex align-items-center gap-2">
            <button type="button" id="scrollToAttachmentBtnTop" class="btn btn-primary">Ir para Anexo</button>
            <button type="button" id="openAttachmentBtnTop" class="btn btn-primary">Abrir Anexo em nova Janela</button>
          </div>
        `;
      }
      // Adiciona listener ao botão "Ir para Anexo" do topo
      const scrollTopBtn = document.getElementById('scrollToAttachmentBtnTop');
      if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
          const target = document.getElementById('attachmentPreview');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
      }
      // Adiciona listener ao botão "Abrir Anexo em nova Janela" do topo
      const openTopBtn = document.getElementById('openAttachmentBtnTop');
      if (openTopBtn) {
        openTopBtn.addEventListener('click', () => {
          window.open(info.filename, '_blank');
        });
      }
      // Renderiza a imagem do anexo abaixo dos botões do wizard
      const previewEl = document.getElementById("attachmentPreview");
      if (previewEl && info.filename) {
        previewEl.innerHTML = `
          <img src="${info.filename}" alt="Anexo do documento" class="img-fluid" />
        `;
      }
      // Exibe o botão de scroll para anexo
      const scrollBtn = document.getElementById('scrollToAttachmentBtn');
      if (scrollBtn) {
        scrollBtn.classList.remove('d-none');
      }
      if (info.tipo_documento === "Nota Fiscal") {
        // Recarrega opções de Fornecedor antes de preencher seleção
        const fornecedorSelectInit = document.getElementById("fornecedorSelect");
        if (fornecedorSelectInit && window.fornecedoresData) {
          fornecedorSelectInit.innerHTML = '<option value="">Selecione</option>';
          window.fornecedoresData.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.uuid || f.id;
            opt.text = `${f.nome} (${f.cnpj})`;
            fornecedorSelectInit.add(opt);
          });
          if (window.$ && $.fn.select2) {
            $("#fornecedorSelect").trigger("change");
          }
        }
        // ===== DEBUG LOGS: Preenchimento de Filial =====
        console.group("DEBUG: Preenchimento de Filial");
        console.log("Classification info:", info);
        console.log("FiliaisData original:", window.filiaisData);
        console.log("CNPJ do tomador extraído:", info.cnpj_tomador);
        console.groupEnd();
        // Preenche campos da nota fiscal com checagem de existência
        const numeroEl = document.getElementById("numeroDocumento");
        if (numeroEl) {
          numeroEl.value = info.numero_nota || "";
          numeroEl.disabled = true;
          const unlockNumero = document.getElementById("unlockNumero");
          if (unlockNumero) {
            unlockNumero.checked = !info.numero_nota;
            numeroEl.disabled = !unlockNumero.checked;
            unlockNumero.disabled = false;
          }
        }

        // Tipo de Documento (read-only)
        const tipoEl = document.getElementById("tipoDocumento");
        if (tipoEl) {
          tipoEl.value = "Nota Fiscal";
          tipoEl.disabled = true;
        }

        const dataEl = document.getElementById("dataEmissao");
        if (dataEl) {
          dataEl.value = info.data_emissao || "";
          dataEl.disabled = true;
          const unlockData = document.getElementById("unlockData");
          if (unlockData) {
            unlockData.checked = !info.data_emissao;
            dataEl.disabled = !unlockData.checked;
          }
          // Atualiza Data de Vencimento = Data Emissão + 7 dias
          const emisClass = new Date(dataEl.value);
          emisClass.setDate(emisClass.getDate() + 7);
          const vencEl = document.getElementById("dataVencimento");
          if (vencEl) vencEl.value = emisClass.toISOString().split("T")[0];
        }

        const valorEl = document.getElementById("valor");
        if (valorEl) {
          // Formata e preenche Valor Bruto como moeda pt-BR
          if (info.valor_total_nota) {
            // Converte string para número considerando formatos "1234.56", "1.234,56" ou "1234,56"
            let raw = info.valor_total_nota;
            let num;
            if (raw.includes(',') && raw.includes('.')) {
              // formato europeu com milhares e decimais: "1.234,56"
              num = Number(raw.replace(/\./g, '').replace(',', '.'));
            } else if (raw.includes(',')) {
              // formato apenas com vírgula decimal: "1234,56"
              num = Number(raw.replace(',', '.'));
            } else {
              // assume formato ponto como decimal: "1234.56" ou inteiro
              num = Number(raw);
            }
            valorEl.value = num.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          } else {
            valorEl.value = "";
          }
          // Valor Bruto somente leitura até “Manual” ser ativado
          valorEl.readOnly = true;
          valorEl.disabled = true;
          const unlockValor = document.getElementById("unlockValor");
          if (unlockValor) {
            unlockValor.checked = false;
            unlockValor.disabled = false;
          }
          // unlockValor event listener (ensure present)
          if (unlockValor && !unlockValor._hasListener) {
            unlockValor.addEventListener("change", e => {
              const enabled = e.target.checked;
              valorEl.readOnly = !enabled;
              valorEl.disabled = !enabled;
              addLog("Valor Bruto definido como " + (enabled ? "Manual" : "Automático"));
            });
            unlockValor._hasListener = true;
          }
        }

        // Atualiza o valor das parcelas para o valor bruto preenchido
        document.querySelectorAll('.parcela-valor').forEach(el => {
          el.value = valorEl.value;
        });

        // Oculta campo Vencimento para Nota Fiscal
        const vencEl = document.getElementById("vencimentoParcela1");
        if (vencEl) {
          const mb3 = vencEl.closest(".mb-3");
          if (mb3) mb3.classList.add("d-none");
        }

        // Preenche CNPJ
        const cnpjEl = document.getElementById("cnpj");
        if (cnpjEl) {
          cnpjEl.value = info.cnpj_fornecedor || "";
          cnpjEl.readOnly = true;
        }

        // Recarrega fornecedores e busca pelo CNPJ do fornecedor
        try {
          window.fornecedoresData = await listFornecedores(AuthService);
        } catch (err) {
          console.error("Erro ao recarregar fornecedores:", err);
        }
        // Hide classification-section before toggling others
        document.getElementById("classification-section").classList.add("d-none");
        // Hide Moeda for Nota Fiscal
        const moedaSelectEl = document.getElementById("moedaSelect");
        if (moedaSelectEl) {
          const moedaGroup = moedaSelectEl.closest(".mb-3");
          if (moedaGroup) moedaGroup.classList.add("d-none");
          moedaSelectEl.required = false;
          moedaSelectEl.disabled = true;
        }
        // Sempre mostra o formulário e oculta o cadastro de fornecedor
        document.getElementById("supplier-registration-section").classList.add("d-none");
        document.getElementById("form-section").classList.remove("d-none");

        // Preenche Filial (Tomador) via API usando CNPJ do tomador
        try {
          const allFiliais = await listFiliais(AuthService, { cnpj: info.cnpj_tomador });
          const filialSelect = document.getElementById("filialSelect");
          filialSelect.innerHTML = '<option value="">Selecione</option>';
          // Filtra apenas filiais cujo CNPJ, sem formatação, coincide exatamente
          const desiredCnpj = info.cnpj_tomador ? info.cnpj_tomador.replace(/\D/g, "") : "";
          const matched = allFiliais.filter(f => {
            const fCnpj = f.cnpj ? f.cnpj.replace(/\D/g, "") : "";
            return fCnpj === desiredCnpj;
          });
          // Popula apenas as filiais correspondentes
          matched.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id || f.uuid || '';
            opt.text = `${f.nome} (${f.cnpj})`;
            filialSelect.add(opt);
          });
          // Se houver correspondência, seleciona e bloqueia o campo
          if (matched.length) {
            filialSelect.value = matched[0].id || matched[0].uuid;
            filialSelect.disabled = true;
            if (window.$ && $.fn.select2) {
              $("#filialSelect").trigger("change");
            }
          }
        } catch (err) {
          console.error("Erro ao buscar filiais do tomador:", err);
        }

        // Seletor do fornecedor (auto-preenchimento)
        const fornecedorSelectRep = document.getElementById("fornecedorSelect");
        if (fornecedorSelectRep) {
          const desiredCnpj = info.cnpj_fornecedor ? info.cnpj_fornecedor.replace(/\D/g, "") : "";
          // Tenta corresponder em lista já carregada
          let existingSupplier = (window.fornecedoresData || []).find(f => {
            const cnpjClean = f.cnpj ? f.cnpj.replace(/\D/g, "") : "";
            return cnpjClean === desiredCnpj;
          });
          // Se não encontrar, reconsulta API filtrando pelo CNPJ
          if (!existingSupplier) {
            try {
              const retryList = await listFornecedores(AuthService, { cnpj: info.cnpj_fornecedor });
              window.fornecedoresData = retryList; // atualiza global
              existingSupplier = retryList.find(f => {
                const cnpjClean = f.cnpj ? f.cnpj.replace(/\D/g, "") : "";
                return cnpjClean === desiredCnpj;
              });
            } catch (err) {
              console.error("Erro ao reconsultar fornecedores:", err);
            }
          }
          // Se encontrou, preenche e trava o select
          if (existingSupplier) {
            fornecedorSelectRep.innerHTML = `<option value="${existingSupplier.uuid || existingSupplier.id}">${existingSupplier.nome} (${existingSupplier.cnpj})</option>`;
            fornecedorSelectRep.value = existingSupplier.uuid || existingSupplier.id;
            fornecedorSelectRep.disabled = true;
            const unlockFornecedor = document.getElementById("unlockFornecedor");
            if (unlockFornecedor) {
              unlockFornecedor.checked = false;
              unlockFornecedor.disabled = false;
            }
            if (window.$ && $.fn.select2) {
              $("#fornecedorSelect").trigger("change");
            }
          }
        }
        showAlert("Documento classificado como Nota Fiscal. Campos preenchidos.", "success");

        // ======= Fim do preenchimento das tabelas =======
      } else if (info.tipo_documento === "Conta a pagar") {
        // Recarrega opções de Fornecedor antes de preencher seleção
        const fornecedorSelectInit = document.getElementById("fornecedorSelect");
        if (fornecedorSelectInit && window.fornecedoresData) {
          fornecedorSelectInit.innerHTML = '<option value="">Selecione</option>';
          window.fornecedoresData.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f.uuid || f.id;
            opt.text = `${f.nome} (${f.cnpj})`;
            fornecedorSelectInit.add(opt);
          });
          if (window.$ && $.fn.select2) {
            $("#fornecedorSelect").trigger("change");
          }
        }
        // Preenche Tipo de Documento (read-only)
        const tipoEl = document.getElementById("tipoDocumento");
        if (tipoEl) {
          tipoEl.value = "Conta a pagar";
          tipoEl.disabled = true;
        }

        // Preenche Valor Bruto
        const valorEl = document.getElementById("valor");
        if (valorEl) {
          // Formata e preenche Valor Bruto como moeda pt-BR
          if (info.valor_total_nota) {
            // Converte string para número considerando formatos "1234.56", "1.234,56" ou "1234,56"
            let raw = info.valor_total_nota;
            let num;
            if (raw.includes(',') && raw.includes('.')) {
              // formato europeu com milhares e decimais: "1.234,56"
              num = Number(raw.replace(/\./g, '').replace(',', '.'));
            } else if (raw.includes(',')) {
              // formato apenas com vírgula decimal: "1234,56"
              num = Number(raw.replace(',', '.'));
            } else {
              // assume formato ponto como decimal: "1234.56" ou inteiro
              num = Number(raw);
            }
            valorEl.value = num.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          } else {
            valorEl.value = "";
          }
          // Valor Bruto somente leitura até “Manual” ser ativado
          valorEl.readOnly = true;
          valorEl.disabled = true;
          const unlockValor = document.getElementById("unlockValor");
          if (unlockValor) {
            unlockValor.checked = false;
            unlockValor.disabled = false;
          }
          // unlockValor event listener (ensure present)
          if (unlockValor && !unlockValor._hasListener) {
            unlockValor.addEventListener("change", e => {
              const enabled = e.target.checked;
              valorEl.readOnly = !enabled;
              valorEl.disabled = !enabled;
              addLog("Valor Bruto definido como " + (enabled ? "Manual" : "Automático"));
            });
            unlockValor._hasListener = true;
          }
        }

        // ===================== Campos adicionais para Conta a pagar =====================
        // Preenche Filial apenas se existir na lista de filiais (Conta a pagar)
        const filialSelect = document.getElementById("filialSelect");
        const unlockFilial = document.getElementById("unlockFilial");
        if (filialSelect) {
          const filiais = window.filiaisData || [];
          const matchFilial = filiais.find(f =>
            (info.cnpj_tomador && f.cnpj === info.cnpj_tomador) ||
            f.nome === info.tomador
          );
          if (matchFilial) {
            // Seleciona filial existente e bloqueia o campo
            filialSelect.value = matchFilial.id || matchFilial.uuid || matchFilial.nome;
            filialSelect.disabled = true;
            if (unlockFilial) {
              unlockFilial.checked = false;
              unlockFilial.disabled = false;
            }
          } else {
            // Nenhuma filial encontrada: mantém campo em branco para seleção manual
            filialSelect.value = "";
            filialSelect.disabled = false;
            if (unlockFilial) {
              unlockFilial.checked = true;
              // Mantém modo manual e não permite desmarcar
              unlockFilial.disabled = true;
            }
          }
          if (window.$ && $.fn.select2) $("#filialSelect").trigger("change");
        }

        // Preenche Fornecedor apenas se existir na lista de fornecedores
        const fornecedorSelect = document.getElementById("fornecedorSelect");
        const unlockFornecedor = document.getElementById("unlockFornecedor");
        if (fornecedorSelect) {
          const fornecedores = window.fornecedoresData || [];
          const match = fornecedores.find(f =>
            (info.cnpj_fornecedor && f.cnpj === info.cnpj_fornecedor) ||
            f.nome === info.fornecedor
          );
          if (match) {
            // Seleciona fornecedor existente e bloqueia o campo
            fornecedorSelect.value = match.id || match.uuid || match.nome;
            fornecedorSelect.disabled = true;
            if (unlockFornecedor) {
              unlockFornecedor.checked = false;
              unlockFornecedor.disabled = false;
            }
            if (window.$ && $.fn.select2) $("#fornecedorSelect").trigger("change");
          } else {
            // Nenhum fornecedor encontrado: mantém campo em branco para seleção manual
            fornecedorSelect.value = "";
            fornecedorSelect.disabled = false;
            if (unlockFornecedor) {
              unlockFornecedor.checked = true;
              // Mantém modo manual e não permite desmarcar
              unlockFornecedor.disabled = true;
            }
          }
        }

        // Preenche Número do Documento
        const numeroEl = document.getElementById("numeroDocumento");
        const unlockNumero = document.getElementById("unlockNumero");
        if (numeroEl) {
          numeroEl.value = info.numero_nota || "";
          numeroEl.disabled = true;
          if (unlockNumero) {
            unlockNumero.checked = false;
            unlockNumero.disabled = false;
          }
          if (!info.numero_nota && unlockNumero) {
            unlockNumero.checked = true;
            unlockNumero.disabled = true;
            numeroEl.disabled = false;
          }
        }

        // Preenche Data de Emissão
        const dataEl = document.getElementById("dataEmissao");
        const unlockData = document.getElementById("unlockData");
        if (dataEl) {
          dataEl.value = info.data_emissao || "";
          dataEl.disabled = true;
          if (unlockData) {
            unlockData.checked = false;
            unlockData.disabled = false;
          }
          // Atualiza Data de Vencimento = Data Emissão + 7 dias
          const emisClass = new Date(dataEl.value);
          emisClass.setDate(emisClass.getDate() + 7);
          const vencEl = document.getElementById("dataVencimento");
          if (vencEl) vencEl.value = emisClass.toISOString().split("T")[0];
        }


        // Hide classification-section before toggling others
        document.getElementById("classification-section").classList.add("d-none");
        // Exibe o formulário
        document.getElementById("form-section").classList.remove("d-none");

        showAlert("Documento classificado como Conta a pagar. Campos preenchidos.", "info");

      } else {
        showAlert("Documento não reconhecido ou ilegível. Preencha manualmente.", "warning");
      }
      // Exibe o JSON bruto para testes, incluindo status_imagem se desejar
      let displayInfo = { ...info };
      document.getElementById("classificationResult").textContent = JSON.stringify(displayInfo, null, 2);
    } catch (err) {
      classificationError.innerHTML = `Erro ao classificar anexo: ${handleError(err)}`;
    } finally {
      hideLoadingOverlay();
      submitBtn.disabled = false;
      // Exibe o formulário após classificação
      // (A exibição do form-section agora é controlada pelo fluxo de fornecedor acima)
    }
  });

  // Permite desbloquear edição de campos pré-preenchidos
  const unlockNumero = document.getElementById("unlockNumero");
  if (unlockNumero) {
    unlockNumero.addEventListener("change", e => {
      document.getElementById("numeroDocumento").disabled = !e.target.checked;
      addLog("N° Documento definido como " + (e.target.checked ? "Manual" : "Automático"));
    });
  }
  const unlockData = document.getElementById("unlockData");
  if (unlockData) {
    unlockData.addEventListener("change", e => {
      document.getElementById("dataEmissao").disabled = !e.target.checked;
      addLog("Data de Emissão definida como " + (e.target.checked ? "Manual" : "Automática"));
    });
  }
  // Valor Bruto desbloqueio manual: handled in classification handler for correct logic.
  const unlockFilial = document.getElementById("unlockFilial");
  if (unlockFilial) {
    unlockFilial.addEventListener("change", e => {
      const sel = document.getElementById("filialSelect");
      sel.disabled = !e.target.checked;
      if (window.$ && $.fn.select2) $("#filialSelect").trigger("change");
      addLog("Filial definida como " + (e.target.checked ? "Manual" : "Automática"));
    });
  }
  const unlockFornecedor = document.getElementById("unlockFornecedor");
  if (unlockFornecedor) {
    unlockFornecedor.addEventListener("change", e => {
      const sel = document.getElementById("fornecedorSelect");
      sel.disabled = !e.target.checked;
      if (window.$ && $.fn.select2) $("#fornecedorSelect").trigger("change");
      addLog("Fornecedor definido como " + (e.target.checked ? "Manual" : "Automático"));
    });
  }

  // Carrega dados das APIs e exibe formulário
  AuthService.onAuthChange(user => {
    if (!user) {
      content.innerHTML = `<div class="alert alert-warning text-center mt-4">Autenticação necessária</div>`;
      return;
    }
    Promise.all([
      listFiliais(AuthService),
      listCentrosCustos(AuthService),
      listProjetos(AuthService),
      listFornecedores(AuthService)
    ])
    .then(([filiaisData, centrosData, projetosData, fornecedoresData]) => {
      window.filiaisData = filiaisData;
      window.centrosData = centrosData;
      window.projetosData = projetosData;
      window.fornecedoresData = fornecedoresData;

      // Preenche opções do select de Projetos
      const projetoSelectEl = document.getElementById("projetoSelect");
      if (projetoSelectEl) {
        // Limpa opções antigas
        projetoSelectEl.innerHTML = '<option value="">Selecione</option>';
        projetosData.forEach(p => {
          const opt = document.createElement("option");
          // Ajuste opt.value conforme o identificador retornado (e.g., p.id ou p.uuid)
          opt.value = p.id || p.uuid || p.nome;
          opt.text = p.nome;
          projetoSelectEl.add(opt);
        });
        // Atualiza Select2, se ativo
        if (window.$ && $.fn.select2) {
          $("#projetoSelect").trigger("change");
        }
      }

      // Preenche opções do select de Centros de Custo
      const centroSelectEl = document.getElementById("centroCustoSelect");
      if (centroSelectEl) {
        // Limpa opções antigas
        centroSelectEl.innerHTML = '<option value="">Selecione</option>';
        centrosData.forEach(c => {
          const opt = document.createElement("option");
          // Ajuste opt.value conforme o identificador retornado (e.g., c.id ou c.uuid)
          opt.value = c.id || c.uuid || c.nome;
          opt.text = `${c.estrutura} - ${c.nome}`;
          centroSelectEl.add(opt);
        });
        // Atualiza Select2, se ativo
        if (window.$ && $.fn.select2) {
          $("#centroCustoSelect").trigger("change");
        }
        // Se houver apenas um centro de custo, pré-seleciona e desabilita
        if (centrosData.length === 1) {
          centroSelectEl.value = centrosData[0].id || centrosData[0].uuid || centrosData[0].nome;
          centroSelectEl.disabled = true;
          if (window.$ && $.fn.select2) {
            $("#centroCustoSelect").trigger("change");
          }
        }
      }

      // Preenche opções do select de Filiais
      const filialSelectEl = document.getElementById("filialSelect");
      if (filialSelectEl) {
        // Limpa opções antigas
        filialSelectEl.innerHTML = '<option value="">Selecione</option>';
        filiaisData.forEach(f => {
          const opt = document.createElement("option");
          opt.value = f.id || f.uuid || f.nome; // ajuste conforme o campo de identificação
          opt.text = `${f.nome} (${f.cnpj})`;
          filialSelectEl.add(opt);
        });
        // Atualiza Select2, se ativo
        if (window.$ && $.fn.select2) {
          $("#filialSelect").trigger("change");
        }
        // Se houver apenas uma filial, pré-seleciona e desabilita
        if (filiaisData.length === 1) {
          filialSelectEl.value = filiaisData[0].id || filiaisData[0].uuid || filiaisData[0].nome;
          filialSelectEl.disabled = true;
          if (window.$ && $.fn.select2) {
            $("#filialSelect").trigger("change");
          }
        }
      }

      // Preenche opções do select de Fornecedores
      const fornecedorSelectEl = document.getElementById("fornecedorSelect");
      if (fornecedorSelectEl) {
        // Limpa opções antigas, exceto placeholder
        fornecedorSelectEl.innerHTML = '<option value="">Selecione</option>';
        fornecedoresData.forEach(f => {
          const name = f.nome || f.razaoSocial;
          const cnpj = f.cnpj;
          // Descarte registros sem nome e sem CNPJ
          if (!name && !cnpj) return;
          const displayName = name;
          const opt = document.createElement("option");
          opt.value = f.uuid || '';
          opt.text = `${displayName} (${cnpj || ''})`;
          fornecedorSelectEl.add(opt);
        });
        // Atualiza Select2, se estiver ativo
        if (window.$ && $.fn.select2) {
          $("#fornecedorSelect").trigger("change");
        }
      }

      // Preencher selects (mesma lógica da v2)...

      // Data de Emissão padrão
      document.getElementById("dataEmissao").value = new Date().toISOString().split("T")[0];
      // Define data padrão para todas as parcelas (hoje + 3 dias)
      const dv = new Date();
      dv.setDate(dv.getDate() + 3);
      const dvStr = dv.toISOString().split("T")[0];
      document.querySelectorAll('.parcela-data').forEach(el => {
        el.value = dvStr;
      });

      // Removido: document.getElementById("form-section").classList.remove("d-none");
      // Não exibe o form-section até classificação
    })
    .catch(err => {
      content.innerHTML = `<div class="alert alert-danger text-center mt-4">Erro ao carregar dados. Tente mais tarde.</div>`;
      console.error("Erro APIs v3:", err);
    });
  });

  // Submissão do form (cópia exata da v2, só ajustar endpoint v3)
  const lancForm = document.getElementById("lancamentoForm");
  lancForm.addEventListener("submit", async e => {
    e.preventDefault();
    showLoadingOverlay("Criando lançamento...");
    const formError = document.getElementById("formError");
    formError.innerHTML = "";
    const btn = lancForm.querySelector("button[type=submit]");
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processando...`;

    // Mesmas validações de campos da v2...
    let errors = [];
    // ... (copiar toda a lógica de validação)

    if (errors.length) {
      formError.innerHTML = `<ul>${errors.map(x=>`<li>${x}</li>`).join("")}</ul>`;
      btn.disabled = false;
      btn.innerHTML = original;
      return;
    }

    // Monta payload v3 com todos os campos e itens da nota
    const dataInclusao = formatDateISO(new Date());
    const classification = window.classificationResult || {};
    // Campos básicos do formulário
    let payload = {
      app_id: "empresa_vtc_log",
      status: "Novo",
      tipo_documento: classification.tipo_documento || document.getElementById("tipoDocumento").value,
      numero_documento: classification.numero_nota || document.getElementById("numeroDocumento").value,
      forma_pagamento: document.getElementById("formaPagamento").value,
      justificativa: document.getElementById("justificativa").value,
      data_emissao: classification.data_emissao || document.getElementById("dataEmissao").value,
      // somente para contas a pagar
      data_vencimento: document.getElementById("dataVencimento").value,
      // Converte valor total da nota (classification.valor_total_nota) para número pt-BR
      valor_nominal: (() => {
        const rawVal = classification.valor_total_nota;
        if (!rawVal) return 0;
        let numVal;
        if (rawVal.includes(',') && rawVal.includes('.')) {
          // formato europeu: "1.234,56"
          numVal = Number(rawVal.replace(/\./g, '').replace(',', '.'));
        } else if (rawVal.includes(',')) {
          // formato vírgula decimal: "1234,56"
          numVal = Number(rawVal.replace(',', '.'));
        } else {
          // ponto decimal ou inteiro: "1234.56" ou "1234"
          numVal = Number(rawVal);
        }
        return numVal;
      })(),
      data_entrada: dataInclusao,
      usuario_inclusao: AuthService.user.email,
      uid: AuthService.user.uid
    };

    // Inclui auditoria, histórico de log e parcelas_financeiras diretamente no payload
    payload.log = window.logEntries || [];
    payload.auditoria = window.auditInfo || {};

    // Filial
    const filEl = document.getElementById("filialSelect");
    payload.filial_id = filEl ? filEl.value : null;
    payload.filial_nome = filEl ? filEl.options[filEl.selectedIndex].text : null;
    if (filEl) {
      const filData = (window.filiaisData || []).find(f => (f.id || f.uuid || f.nome) == filEl.value);
      payload.filial_cnpj = filData ? filData.cnpj : null;
    } else {
      payload.filial_cnpj = null;
    }

    // Centro de Custo
    const ctrEl = document.getElementById("centroCustoSelect");
    payload.centro_custo_id = ctrEl ? ctrEl.value : null;
    payload.centro_custo_nome = ctrEl ? ctrEl.options[ctrEl.selectedIndex].text : null;
    // Capture 'codigo' from the selected Centro de Custo
    if (ctrEl) {
      const centroObj = (window.centrosData || []).find(c =>
        (c.id || c.uuid || c.nome) == ctrEl.value
      );
      payload.centro_custo_codigo = centroObj ? centroObj.codigo : null;
    } else {
      payload.centro_custo_codigo = null;
    }

    // Projeto (opcional)
    const projEl = document.getElementById("projetoSelect");
    payload.projeto_id = projEl && projEl.value ? projEl.value : null;
    payload.projeto_nome = projEl && projEl.value ? projEl.options[projEl.selectedIndex].text : null;

    // Fornecedor ou novo cadastro
    if (classification.tipo_documento === "Nota Fiscal" && classification.cnpj_fornecedor) {
      // fornecedor existente para Nota Fiscal
      payload.fornecedor_cnpj = classification.cnpj_fornecedor;
      payload.fornecedor_id = document.getElementById("fornecedorSelect").value;
      payload.fornecedor_nome = document.getElementById("fornecedorSelect")
        .options[document.getElementById("fornecedorSelect").selectedIndex]
        .text.split(" (")[0];
    } else if (classification.tipo_documento === "Conta a pagar") {
      // fornecedor selecionado para Conta a pagar
      const fornecedorId = document.getElementById("fornecedorSelect").value;
      payload.fornecedor_id = fornecedorId;
      const fornecedorObj = (window.fornecedoresData || []).find(f =>
        (f.uuid === fornecedorId) || (f.id === fornecedorId)
      );
      payload.fornecedor_cnpj = fornecedorObj ? fornecedorObj.cnpj : null;
      payload.fornecedor_nome = fornecedorObj ? fornecedorObj.nome : null;
    } else {
      // novo fornecedor (manualmente cadastrado)
      payload.fornecedor_cnpj = classification.cnpj_fornecedor || document.getElementById("supCnpj").value;
      payload.fornecedor_nome = classification.fornecedor || document.getElementById("supNome").value;
    }


    // Anexos: documento classificado (Nota Fiscal ou Conta a pagar) e comprovantes de boleto
    payload.anexo = [];
    // Anexo do documento classificado (Nota Fiscal ou Conta a pagar)
    if (classification.filename) {
      // Usa o tipo de documento como categoria do anexo
      const docCategory = classification.tipo_documento || "Anexo";
      payload.anexo.push({ url: classification.filename, categoria: docCategory });
    }
    // Usa URLs pré-carregadas dos boletos
    if (window.boletoUrls && window.boletoUrls.length) {
      window.boletoUrls.forEach(url => {
        payload.anexo.push({ url, categoria: "Boleto" });
      });
    }



    try {
      // Debug: output the assembled payload to console
      console.log("Payload v6:", JSON.stringify(payload, null, 2));
      // **Aqui** chame createLancamento para o endpoint v6
      const result = await createLancamento(AuthService, payload, { apiVersion: "v6" });
      if (!result.id) throw new Error("Resposta inesperada da API.");
      // Log de criação do lançamento
      addLog(`Lançamento criado por ${AuthService.user.email}`);
      await showAlert("Lançamento criado com sucesso! ID: " + result.id, "success");
      // Navega para a tela de gestor após criação
      location.hash = "#vtc-financeiro-gestor";
      return;
    } catch (err) {
      formError.innerHTML = `Erro ao criar lançamento: ${handleError(err, "CreateLancamentov6")}`;
    } finally {
      hideLoadingOverlay();
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });


  // Voltar na classificação
  const backBtnClassify = document.getElementById("backBtnClassify");
  if (backBtnClassify) {
    backBtnClassify.addEventListener("click", () => {
      location.hash = "#vtc-financeiro-gestor";
    });
  }

// Dropzone for mobile-friendly file upload
const dropZone = document.getElementById('dropZone');
const arquivoInput = document.getElementById('arquivoClassify');
if (dropZone && arquivoInput) {
  dropZone.addEventListener('click', () => arquivoInput.click());
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dropzone-hover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dropzone-hover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dropzone-hover');
    arquivoInput.files = e.dataTransfer.files;
    arquivoInput.dispatchEvent(new Event('change'));
  });
  // Also open file picker when tapping the text
  const browseBtn = document.getElementById('browseBtn');
  if (browseBtn) {
    browseBtn.addEventListener('click', e => {
      e.stopPropagation();
      arquivoInput.click();
    });
  }
}

}

// Registra a rota v6
registerRoute("#vtc-financeiro-lancamento-create-v6", renderFinanceiroLancamentoCreatev6);

  function updateItemRemoveButtons() {
    const rows = document.querySelectorAll('#itensTable tbody tr');
    const disabled = rows.length <= 1;
    rows.forEach(tr => {
      const btn = tr.querySelector('.remove-item');
      if (btn) btn.disabled = disabled;
    });
  }

  // Utility to add a row to a table and update buttons
  function addTableRow(tableSelector, rowHtml, updateFn) {
    const tbody = document.querySelector(`${tableSelector} tbody`);
    if (!tbody) return;
    tbody.insertAdjacentHTML('beforeend', rowHtml);
    updateFn();
  }

  // Utility to handle remove-row button clicks
  function initRemoveRow(buttonSelector, updateFn) {
    document.addEventListener('click', e => {
      if (e.target.matches(buttonSelector)) {
        const tr = e.target.closest('tr');
        if (tr) tr.remove();
        updateFn();
      }
    });
  }


  // Initialize itens add/remove
  const itemRowHtml = `
    <tr>
      <td><input type="text" name="itemDescricao[]" class="form-control" required></td>
      <td><input type="text" name="itemQuantidade[]" class="form-control" required></td>
      <td><input type="text" name="itemValorUnitario[]" class="form-control mask-currency" required></td>
      <td><button type="button" class="btn btn-sm btn-danger remove-item">Remover</button></td>
    </tr>`;
  const addItemBtn = document.getElementById('addItemBtn');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      addTableRow('#itensTable', itemRowHtml, updateItemRemoveButtons);
    });
  }
  initRemoveRow('.remove-item', updateItemRemoveButtons);