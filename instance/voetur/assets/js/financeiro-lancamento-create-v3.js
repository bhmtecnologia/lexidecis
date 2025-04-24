/**
 * @file financeiro-lancamento-create-v3.js
 * @description Versão v3 da página de "Financeiro - Lançamento Create", permite criação de lançamentos via formulário
 * e envia os dados para a API v3.
 * Campos: Filial, Fornecedor, Conta Financeira, Centro de Custo, Projeto, N° Documento, Tipo de Documento,
 * Data de Emissão, Valor Bruto, Forma de Pagamento, Vencimento, Justificativa e Anexo(s).
 *
 * API de lançamento utilizada (v3): https://n8n.power.tec.br/webhook-test/voetur/v3/lancamentos
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

  // Centro de Custo
  const ctrSelect = document.getElementById("centroCustoSelect");
  if (window.centrosData && window.centrosData.length === 1) {
    ctrSelect.value = window.centrosData[0].nome;
    ctrSelect.disabled = true;
    if (window.$ && $.fn.select2) {
      $("#centroCustoSelect").val(window.centrosData[0].nome).trigger("change");
    }
  } else padBlankSelect("centroCustoSelect");

  // Projeto (sempre vazio)
  padBlankSelect("projetoSelect");

  // Inputs padrões
  document.getElementById("numeroDocumento").value = "";
  document.getElementById("tipoDocumento").value = "";
  document.getElementById("dataEmissao").value = new Date().toISOString().split("T")[0];
  document.getElementById("valor").value = "";
  document.getElementById("formaPagamento").value = "";
  // Vencimento = hoje + 3 dias
  let venc = new Date();
  venc.setDate(venc.getDate() + 3);
  document.getElementById("vencimento").value = venc.toISOString().split("T")[0];
  document.getElementById("justificativa").value = "";
  document.getElementById("arquivo").value = "";
}

export async function renderFinanceiroLancamentoCreateV3() {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="container-fluid" style="background-color: var(--body-color); color: var(--body-font-color);">
      <!-- Loading Overlay -->
      <div id="loadingOverlay" class="d-none" style="
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(255,255,255,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;">
        <div class="spinner-border" role="status" style="width: 4rem; height: 4rem;">
          <span class="visually-hidden">Carregando...</span>
        </div>
      </div>
      <div class="page-title" style="padding: 1rem;">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2 style="color: var(--black);">Financeiro - Lançamento Create V3</h2>
            <p class="mb-0" style="color: var(--black);">Crie e gerencie novos lançamentos de pagamento (v3)</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb" style="color: var(--theme-default);">
              <li class="breadcrumb-item"><a href="index.html" style="color: var(--theme-default);"><i class="iconly-Home icli svg-color"></i></a></li>
              <li class="breadcrumb-item" style="color: var(--theme-default);">Financeiro</li>
              <li class="breadcrumb-item active" style="color: var(--theme-default);">Lançamento Create V3</li>
            </ol>
          </div>
        </div>
      </div>
      <div id="classification-section" class="mt-4">
        <div class="card" style="border:1px solid var(--border-color);background:var(--white);color:var(--black);">
          <div class="card-body">
            <h3 style="color: var(--black);">Classifique o Documento</h3>
            <div class="mb-3">
              <label for="arquivoClassify" class="form-label">Upload do Documento <span style="color:red">*</span></label>
              <input type="file" class="form-control" id="arquivoClassify" accept="image/png,image/jpeg">
              <small class="form-text text-muted">Envie uma imagem para classificação inicial.</small>
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
              <!-- Link do Anexo -->
              <div id="attachmentLink" class="mb-3"></div>
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
                  <label for="filialSelect" class="form-label">Filial <span style="color:red">*</span></label>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="unlockFilial">
                    <label class="form-check-label" for="unlockFilial">Manual</label>
                  </div>
                </div>
                <select class="form-control" id="filialSelect" required><option value="">Selecione</option></select>
              </div>
              <!-- Fornecedor -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                  <label for="fornecedorSelect" class="form-label">Fornecedor <span style="color:red">*</span></label>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="unlockFornecedor">
                    <label class="form-check-label" for="unlockFornecedor">Manual</label>
                  </div>
                </div>
                <select class="form-control" id="fornecedorSelect" required><option value="">Selecione</option></select>
              </div>
              <!-- Centro de Custo -->
              <div class="mb-3">
                <label for="centroCustoSelect" class="form-label">Centro de Custo <span style="color:red">*</span></label>
                <select class="form-control" id="centroCustoSelect" required><option value="">Selecione</option></select>
              </div>
              <!-- Projeto -->
              <div class="mb-3">
                <label for="projetoSelect" class="form-label">Projeto</label>
                <select class="form-control" id="projetoSelect"><option value="">Selecione</option></select>
              </div>
              <!-- Número do Documento -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                  <label for="numeroDocumento" class="form-label">N° Documento <span style="color:red">*</span></label>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="unlockNumero">
                    <label class="form-check-label" for="unlockNumero">Manual</label>
                  </div>
                </div>
                <input type="text" class="form-control" id="numeroDocumento" required placeholder="Digite o número do documento">
              </div>
              <!-- Data de Emissão -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                  <label for="dataEmissao" class="form-label">Data de Emissão <span style="color:red">*</span></label>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="unlockData">
                    <label class="form-check-label" for="unlockData">Manual</label>
                  </div>
                </div>
                <input type="date" class="form-control" id="dataEmissao" required>
                <small class="form-text text-muted">Não pode ser superior à data atual.</small>
              </div>
              <!-- Valor Bruto -->
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                  <label for="valor" class="form-label">Valor Bruto <span style="color:red">*</span></label>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" id="unlockValor">
                    <label class="form-check-label" for="unlockValor">Manual</label>
                  </div>
                </div>
                <input type="text" class="form-control" id="valor" required placeholder="0,00">
              </div>
              <!-- Forma de Pagamento -->
              <div class="mb-3">
                <label for="formaPagamento" class="form-label">Forma de Pagamento <span style="color:red">*</span></label>
                <select class="form-select" id="formaPagamento" required>
                  <option value="">Selecione</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Pix">Pix</option>
                  <option value="Depósito">Depósito</option>
                </select>
              </div>
              <!-- Anexo(s) -->
              <div class="mb-3 d-none">
                <label for="arquivo" class="form-label">Inserir Anexo(s) <span style="color:red">*</span></label>
                <input type="file" class="form-control" id="arquivo" accept="image/png,image/jpeg" multiple>
                <small class="form-text text-muted">Máx. 4MB por arquivo. PNG/JPEG.</small>
              </div>
              <!-- Vencimento -->
              <div class="mb-3">
                <label for="vencimento" class="form-label">Vencimento <span style="color:red">*</span></label>
                <input type="date" class="form-control" id="vencimento" required>
              </div>
              <!-- Justificativa -->
              <div class="mb-3">
                <label for="justificativa" class="form-label">Justificativa <span style="color:red">*</span></label>
                <textarea class="form-control" id="justificativa" rows="3" required placeholder="Justifique o lançamento conforme PR-001."></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Criar Lançamento v3</button>
            </form>
            <div id="formError" class="mt-2 text-danger" role="alert"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inicializa Select2
  if (window.$ && $.fn.select2) {
    $("#filialSelect").select2({ placeholder: "Selecione uma filial", width: "100%" });
    $("#fornecedorSelect").select2({ placeholder: "Selecione um fornecedor", width: "100%", minimumInputLength: 3, allowClear: true });
    $("#centroCustoSelect").select2({ placeholder: "Selecione um centro de custo", width: "100%" });
    $("#projetoSelect").select2({ placeholder: "Selecione um projeto", allowClear: true, width: "100%" });
  }

  // Aplica máscara de moeda no campo Valor Bruto
  const valorInput = document.getElementById("valor");
  if (valorInput) {
    valorInput.addEventListener("input", (e) => {
      // Remove caracteres não numéricos
      let v = e.target.value.replace(/\D/g, "");
      // Converte para número e formata com duas casas decimais
      const numeric = Number(v) / 100;
      e.target.value = numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });
  }

  // Exibe campo de anexo para boletos
  const formaEl = document.getElementById("formaPagamento");
  if (formaEl) {
    formaEl.addEventListener("change", () => {
      const anexGroup = document.querySelector("#arquivo").closest(".mb-3");
      if (formaEl.value === "Boleto") {
        anexGroup.classList.remove("d-none");
      } else {
        anexGroup.classList.add("d-none");
      }
    });
  }

  // Upload imediato dos boletos ao selecionar
  const boletoInput = document.getElementById("arquivo");
  window.boletoUrls = []; // armazena URLs dos uploads
  if (boletoInput) {
    boletoInput.addEventListener("change", async (e) => {
      window.boletoUrls = [];
      const files = Array.from(e.target.files);
      // Limpa preview anterior
      let previewEl = document.getElementById("boletoPreview");
      if (previewEl) {
        previewEl.innerHTML = "";
      }
      for (const file of files) {
        try {
          const resp = await uploadArquivo(AuthService, file);
          const url = resp.filename || resp.url || resp;
          window.boletoUrls.push(url);
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
        } catch (err) {
          showAlert(`Erro ao enviar boleto ${file.name}: ${handleError(err)}`, "danger");
        }
      }
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
    // Exibe overlay de carregamento
    const overlay = document.getElementById("loadingOverlay");
    submitBtn.disabled = true;
    if (overlay) overlay.classList.remove("d-none");
    try {
      // Esconde a área de classificação
      document.getElementById("classification-section").classList.add("d-none");
      // Atualiza título da página para criação de lançamento
      const pageTitle = document.querySelector(".page-title h2");
      if (pageTitle) pageTitle.textContent = "Financeiro - Novo Lançamento";
      // Realiza upload e classificação para cada arquivo
      let resultados = [];
      for (const file of files) {
        // uploadArquivo deve aceitar a opção { classify: true } e retornar o JSON de classificação
        const resp = await uploadArquivo(AuthService, file, { classify: true });
        resultados.push(resp);
      }
      // Processa o primeiro resultado
      const info = resultados[0];
      // Armazena resultado para submissão
      window.classificationResult = info;
      // Exibe link clicável do anexo
      const attachmentEl = document.getElementById("attachmentLink");
      if (attachmentEl && info.filename) {
        attachmentEl.innerHTML = `<label class="form-label">Anexo:</label>
          <div><a href="${info.filename}" target="_blank">${info.filename}</a></div>`;
      }
      if (info.tipo_documento === "Nota Fiscal") {
        // Preenche campos da nota fiscal com checagem de existência
        const numeroEl = document.getElementById("numeroDocumento");
        if (numeroEl) {
          numeroEl.value = info.numero_nota || "";
          numeroEl.disabled = true;
          const unlockNumero = document.getElementById("unlockNumero");
          if (unlockNumero) {
            unlockNumero.checked = !info.numero_nota;
            numeroEl.disabled = !unlockNumero.checked;
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
          valorEl.disabled = true;
          const unlockValor = document.getElementById("unlockValor");
          if (unlockValor) {
            unlockValor.checked = !info.valor_total_nota;
            valorEl.disabled = !unlockValor.checked;
          }
        }

        // Oculta campo Vencimento para Nota Fiscal
        const vencEl = document.getElementById("vencimento");
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
        const fornecedorSelect = document.getElementById("fornecedorSelect");
        const match = (window.fornecedoresData || []).find(f => f.cnpj === info.cnpj_fornecedor);
        // Hide classification-section before toggling others
        document.getElementById("classification-section").classList.add("d-none");
        if (match) {
          // Oculta seção de cadastro e exibe formulário normal
          document.getElementById("supplier-registration-section").classList.add("d-none");
          document.getElementById("form-section").classList.remove("d-none");
          // Seletor do fornecedor (criado ou existente)
          let optionValue = match.uuid;
          const fornecedorSelect = document.getElementById("fornecedorSelect");
          fornecedorSelect.value = optionValue;
          fornecedorSelect.disabled = true;
          const unlockFornecedor = document.getElementById("unlockFornecedor");
          if (unlockFornecedor) {
            unlockFornecedor.checked = !info.cnpj_fornecedor;
            fornecedorSelect.disabled = !unlockFornecedor.checked;
            if (window.$ && $.fn.select2) $("#fornecedorSelect").trigger("change");
          }
          // Preenche filial com o tomador (sua filial que contratou)
          const filialMatch = (window.filiaisData || []).find(f => f.cnpj === info.cnpj_tomador);
          if (filialMatch) {
            const filialSelect = document.getElementById("filialSelect");
            filialSelect.value = filialMatch.id || filialMatch.uuid || filialMatch.nome;
            filialSelect.disabled = true;
            const unlockFilial = document.getElementById("unlockFilial");
            if (unlockFilial) {
              unlockFilial.checked = !info.cnpj_tomador;
              filialSelect.disabled = !unlockFilial.checked;
              if (window.$ && $.fn.select2) $("#filialSelect").trigger("change");
            }
          }
          showAlert("Documento classificado como Nota Fiscal. Campos preenchidos.", "success");
        } else {
          // Oculta formulário normal
          document.getElementById("form-section").classList.add("d-none");
          // Exibe seção de registro de fornecedor
          const supplierSection = document.getElementById("supplier-registration-section");
          supplierSection.classList.remove("d-none");
          // Preenche dados no formulário de cadastro
          const supNomeEl = document.getElementById("supNome");
          if (supNomeEl) supNomeEl.value = info.fornecedor || "";
          const supCnpjEl = document.getElementById("supCnpj");
          if (supCnpjEl) supCnpjEl.value = info.cnpj_fornecedor || "";
          // Botão para preencher manualmente
          let manualBtn = document.getElementById("btnManualEntry");
          if (!manualBtn) {
            manualBtn = document.createElement("button");
            manualBtn.type = "button";
            manualBtn.id = "btnManualEntry";
            manualBtn.className = "btn btn-secondary mt-3";
            manualBtn.textContent = "Preencher manualmente";
            supplierSection.appendChild(manualBtn);
            manualBtn.addEventListener("click", () => {
              supplierSection.classList.add("d-none");
              const formSection = document.getElementById("form-section");
              formSection.classList.remove("d-none");
              const fornecedorSelect = document.getElementById("fornecedorSelect");
              fornecedorSelect.value = "";
              fornecedorSelect.disabled = false;
              if (window.$ && $.fn.select2) $("#fornecedorSelect").trigger("change");
            });
          }
        }
      } else if (info.tipo_documento === "Conta a pagar") {
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
          valorEl.readOnly = true;
          const unlockValor = document.getElementById("unlockValor");
          if (unlockValor) {
            unlockValor.checked = !info.valor_total_nota;
            valorEl.disabled = !unlockValor.checked;
          }
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
      submitBtn.disabled = false;
      // Oculta overlay de carregamento
      if (overlay) overlay.classList.add("d-none");
      // Exibe o formulário após classificação
      // (A exibição do form-section agora é controlada pelo fluxo de fornecedor acima)
    }
  });
  // Mesmas validações de campo da v2...
  // [ ... copiar todos os eventListeners de change, blur, keypress etc. da v2 aqui ... ]

  // Permite desbloquear edição de campos pré-preenchidos
  const unlockNumero = document.getElementById("unlockNumero");
  if (unlockNumero) {
    unlockNumero.addEventListener("change", e => {
      document.getElementById("numeroDocumento").disabled = !e.target.checked;
    });
  }
  const unlockData = document.getElementById("unlockData");
  if (unlockData) {
    unlockData.addEventListener("change", e => {
      document.getElementById("dataEmissao").disabled = !e.target.checked;
    });
  }
  const unlockValor = document.getElementById("unlockValor");
  if (unlockValor) {
    unlockValor.addEventListener("change", e => {
      document.getElementById("valor").disabled = !e.target.checked;
    });
  }
  const unlockFilial = document.getElementById("unlockFilial");
  if (unlockFilial) {
    unlockFilial.addEventListener("change", e => {
      const sel = document.getElementById("filialSelect");
      sel.disabled = !e.target.checked;
      if (window.$ && $.fn.select2) $("#filialSelect").trigger("change");
    });
  }
  const unlockFornecedor = document.getElementById("unlockFornecedor");
  if (unlockFornecedor) {
    unlockFornecedor.addEventListener("change", e => {
      const sel = document.getElementById("fornecedorSelect");
      sel.disabled = !e.target.checked;
      if (window.$ && $.fn.select2) $("#fornecedorSelect").trigger("change");
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
          opt.text = c.nome;
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
          const opt = document.createElement("option");
          opt.value = f.uuid;
          opt.text = `${f.nome} (${f.cnpj})`;
          fornecedorSelectEl.add(opt);
        });
        // Atualiza Select2, se estiver ativo
        if (window.$ && $.fn.select2) {
          $("#fornecedorSelect").trigger("change");
        }
      }

      // Preencher selects (mesma lógica da v2)...

      // Data emission/vencimento default
      document.getElementById("dataEmissao").value = new Date().toISOString().split("T")[0];
      let dv = new Date(); dv.setDate(dv.getDate()+3);
      document.getElementById("vencimento").value = dv.toISOString().split("T")[0];

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
      data_vencimento: classification.tipo_documento === "Conta a pagar"
        ? document.getElementById("vencimento").value
        : null,
      // Converte valor total da nota (classification.valor_total_nota) para número pt-BR
      valor: (() => {
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
      data_inclusao: dataInclusao,
      usuario_inclusao: AuthService.user.email,
      uid: AuthService.user.uid
    };

    // Filial
    const filEl = document.getElementById("filialSelect");
    payload.filial_id = filEl ? filEl.value : null;
    payload.filial_nome = filEl ? filEl.options[filEl.selectedIndex].text : null;

    // Centro de Custo
    const ctrEl = document.getElementById("centroCustoSelect");
    payload.centro_custo_id = ctrEl ? ctrEl.value : null;
    payload.centro_custo_nome = ctrEl ? ctrEl.options[ctrEl.selectedIndex].text : null;

    // Projeto (opcional)
    const projEl = document.getElementById("projetoSelect");
    payload.projeto_id = projEl && projEl.value ? projEl.value : null;
    payload.projeto_nome = projEl && projEl.value ? projEl.options[projEl.selectedIndex].text : null;

    // Fornecedor ou novo cadastro
    if (classification.tipo_documento === "Nota Fiscal" && classification.cnpj_fornecedor) {
      // fornecedor existente
      payload.fornecedor_cnpj = classification.cnpj_fornecedor;
      payload.fornecedor_id = document.getElementById("fornecedorSelect").value;
      payload.fornecedor_nome = document.getElementById("fornecedorSelect").options[
        document.getElementById("fornecedorSelect").selectedIndex
      ].text.split(" (")[0];
    } else {
      // novo fornecedor
      payload.fornecedor_cnpj = classification.cnpj_fornecedor || document.getElementById("supCnpj").value;
      payload.fornecedor_nome = classification.fornecedor || document.getElementById("supNome").value;
    }

    // Itens de nota fiscal, se aplicável
    payload.itens = Array.isArray(classification.itens) ? classification.itens.map(item => {
      // Converte valor_unitario para número pt-BR corretamente
      let raw = item.valor_unitario.toString();
      let numUnit;
      if (raw.includes(',') && raw.includes('.')) {
        // formato europeu com milhares e decimais: "1.234,56"
        numUnit = Number(raw.replace(/\./g, '').replace(',', '.'));
      } else if (raw.includes(',')) {
        // apenas vírgula decimal: "1234,56"
        numUnit = Number(raw.replace(',', '.'));
      } else {
        // ponto decimal ou inteiro: "1234.56" ou "1234"
        numUnit = Number(raw);
      }
      return {
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: numUnit
      };
    }) : [];

    // Anexos: Nota Fiscal e Comprovantes de Boleto
    payload.anexo = [];
    // Anexo da Nota Fiscal
    if (classification.filename) {
      payload.anexo.push({ url: classification.filename, categoria: "Nota Fiscal" });
    }
    // Usa URLs pré-carregadas dos boletos
    if (window.boletoUrls && window.boletoUrls.length) {
      window.boletoUrls.forEach(url => {
        payload.anexo.push({ url, categoria: "Boleto" });
      });
    }
    /*
    // Anexos de Boletos, se houver (original, removido para evitar uploads duplicados)
    const boletoInput = document.getElementById("arquivo");
    if (boletoInput && boletoInput.files.length) {
      for (const file of boletoInput.files) {
        // Faz upload do boleto (sem classification)
        const uploadResp = await uploadArquivo(AuthService, file);
        // Extrai URL do retorno (filename ou url)
        const boletoUrl = uploadResp.filename || uploadResp.url || uploadResp;
        payload.anexo.push({ url: boletoUrl, categoria: "Boleto" });
      }
    }
    */



    try {
      // **Aqui** chame createLancamento para o endpoint v3
      const result = await createLancamento(AuthService, payload, { apiVersion: "v3" });
      if (!result.id) throw new Error("Resposta inesperada da API.");
      await showAlert("Lançamento criado com sucesso! ID: " + result.id, "success");
      lancForm.reset();
      resetFormFields();
    } catch (err) {
      formError.innerHTML = `Erro ao criar lançamento: ${handleError(err, "CreateLancamentoV3")}`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

// Registra a rota v3
registerRoute("#financeiro-lancamento-create-v3", renderFinanceiroLancamentoCreateV3);
// (Busca e substituição global de info.cnpj_tomar por info.cnpj_tomador)