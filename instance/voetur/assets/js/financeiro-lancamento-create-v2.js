/**
 * @file financeiro-lancamento-create-v2.js
 * @description Responsável por renderizar a página de "Financeiro - Lançamento Create V2" no módulo financeiro,
 * permitindo a criação de novos lançamentos via formulário e enviando os dados para a API.
 * Os campos Filial, Fornecedor, Conta Financeira, N° Documento, Tipo de Documento, Data de Emissão, Valor Bruto,
 * Forma de Pagamento, Vencimento, Centro de Custo, Projeto, Justificativa e Inserir Anexo são apresentados
 * e serão enviados para a API no formato JSON.
 *
 * API de lançamento utilizada: https://n8n.power.tec.br/webhook-test/voetur/v1/lancamentos
 *
 * Observação: A função listContasFinanceiras é utilizada para obter a lista de contas financeiras.
 */

// Função centralizada para tratamento de erros
function handleError(error, context = "Erro") {
    console.error("[" + context + "]", error);
    return error.message || "Ocorreu um erro inesperado";
  }
  
  import { registerRoute } from "./router.js";
  import AuthService, { auth, db, analytics } from "./auth.js";
  import {
    createLancamento,
    uploadArquivo,
    listCentrosCustos,
    listProjetos,
    listFiliais,
    listFornecedores,
    listContasFinanceiras
  } from "./api.js";
  
  // Função auxiliar para formatar a data no padrão "yyyy-mm-dd hh:mm:ss"
  function formatDateISO(dateObj) {
    const pad = (num) => num.toString().padStart(2, "0");
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    const seconds = pad(dateObj.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  // Função para reinicializar os campos que foram preenchidos de forma automática
  // caso o formulário seja resetado após um lançamento.
  // Ela reconfigura os campos de Filial, Centro de Custo e Conta Financeira de acordo
  // com os dados carregados e com a lógica aplicada quando há somente uma opção.
  function resetFormFields() {
    // Filial
    const filialInput = document.getElementById("filialInput");
    if (window.filiaisData && window.filiaisData.length === 1) {
      const fil = window.filiaisData[0];
      filialInput.value = fil.nome;
      filialInput.setAttribute("readonly", "true");
    } else {
      filialInput.removeAttribute("readonly");
    }
  
    // Centro de Custo
    const centroCustoInput = document.getElementById("centroCustoInput");
    if (window.centrosData && window.centrosData.length === 1) {
      const centro = window.centrosData[0];
      centroCustoInput.value = centro.nome;
      centroCustoInput.setAttribute("readonly", "true");
    } else {
      centroCustoInput.removeAttribute("readonly");
    }
  
    // Conta Financeira
    const contaSelect = document.getElementById("contaFinanceiraSelect");
    if (window.contasFinanceirasData && window.contasFinanceirasData.length === 1) {
      const conta = window.contasFinanceirasData[0];
      contaSelect.value = `${conta.estrutura} - ${conta.codigo} - ${conta.nome}`;
      // Se desejar bloquear a edição, pode desabilitar o Select2 para esse campo.
      contaSelect.setAttribute("readonly", "true");
    } else {
      contaSelect.removeAttribute("readonly");
    }
  }
  
  export async function renderFinanceiroLancamentoCreateV2() {
    const content = document.getElementById("content");
    content.innerHTML = `
      <div class="container-fluid" style="background-color: var(--body-color); color: var(--body-font-color);">
        <div class="page-title" style="padding: 1rem;">
          <div class="row">
            <div class="col-sm-6 col-12">
              <h2 style="color: var(--black);">Financeiro - Lançamento Create V2</h2>
              <p class="mb-0" style="color: var(--black);">Crie e gerencie novos lançamentos de pagamento</p>
            </div>
            <div class="col-sm-6 col-12">
              <ol class="breadcrumb" style="color: var(--theme-default);">
                <li class="breadcrumb-item">
                  <a href="index.html" style="color: var(--theme-default);">
                    <i class="iconly-Home icli svg-color"></i>
                  </a>
                </li>
                <li class="breadcrumb-item" style="color: var(--theme-default);">Financeiro</li>
                <li class="breadcrumb-item active" style="color: var(--theme-default);">Lançamento Create V2</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div id="form-section" class="mt-4">
          <div class="card" style="border: 1px solid var(--border-color); background-color: var(--white); color: var(--black);">
            <div class="card-body">
              <form id="lancamentoForm">
                <!-- Campo: Filial -->
                <div class="mb-3">
                  <label for="filialInput" class="form-label" style="color: var(--black);">
                    Filial <span style="color: red;">*</span>
                  </label>
                  <input class="form-control" id="filialInput" list="filialOptions" placeholder="Digite ou escolha uma filial" required aria-required="true">
                  <datalist id="filialOptions">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <!-- Campo: Fornecedor (usando Select2) -->
                <div class="mb-3">
                  <label for="fornecedorSelect" class="form-label" style="color: var(--black);">
                    Fornecedor <span style="color: red;">*</span>
                  </label>
                  <select class="form-control" id="fornecedorSelect" required aria-required="true">
                    <option value="">Selecione</option>
                  </select>
                </div>
                <!-- Campo: Conta Financeira (usando Select2) -->
                <div class="mb-3">
                  <label for="contaFinanceiraSelect" class="form-label" style="color: var(--black);">
                    Conta Financeira <span style="color: red;">*</span>
                  </label>
                  <select class="form-control" id="contaFinanceiraSelect" required aria-required="true">
                    <option value="">Selecione</option>
                  </select>
                </div>
                <!-- Campo: N° Documento -->
                <div class="mb-3">
                  <label for="numeroDocumento" class="form-label" style="color: var(--black);">
                    N° Documento <span style="color: red;">*</span>
                  </label>
                  <input type="text" class="form-control" id="numeroDocumento" placeholder="Digite o número do documento" required aria-required="true">
                </div>
                <!-- Campo: Tipo de Documento -->
                <div class="mb-3">
                  <label for="tipoDocumento" class="form-label" style="color: var(--black);">
                    Tipo de Documento <span style="color: red;">*</span>
                  </label>
                  <select class="form-select" id="tipoDocumento" required aria-required="true">
                    <option value="">Selecione</option>
                    <option value="Nota Fiscal">Nota Fiscal</option>
                    <option value="Fatura">Fatura</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Reembolso">Reembolso</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <!-- Campo: Data de Emissão -->
                <div class="mb-3">
                  <label for="dataEmissao" class="form-label" style="color: var(--black);">
                    Data de Emissão <span style="color: red;">*</span>
                  </label>
                  <input type="date" class="form-control" id="dataEmissao" required aria-required="true">
                  <small class="form-text text-muted" style="color: var(--black);">
                    A data de emissão não pode ser superior à data atual
                  </small>
                </div>
                <!-- Campo: Valor Bruto -->
                <div class="mb-3">
                  <label for="valor" class="form-label" style="color: var(--black);">
                    Valor Bruto <span style="color: red;">*</span>
                  </label>
                  <input type="text" class="form-control" id="valor" placeholder="0,00" required aria-required="true">
                </div>
                <!-- Campo: Forma de Pagamento -->
                <div class="mb-3">
                  <label for="formaPagamento" class="form-label" style="color: var(--black);">
                    Forma de Pagamento <span style="color: red;">*</span>
                  </label>
                  <select class="form-select" id="formaPagamento" required aria-required="true">
                    <option value="">Selecione</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Pix">Pix</option>
                    <option value="Depósito">Depósito</option>
                  </select>
                </div>
                <!-- Campo: Vencimento -->
                <div class="mb-3">
                  <label for="vencimento" class="form-label" style="color: var(--black);">
                    Vencimento <span style="color: red;">*</span>
                  </label>
                  <input type="date" class="form-control" id="vencimento" required aria-required="true">
                </div>
                <!-- Campo: Centro de Custo -->
                <div class="mb-3">
                  <label for="centroCustoInput" class="form-label" style="color: var(--black);">
                    Centro de Custo <span style="color: red;">*</span>
                  </label>
                  <input class="form-control" id="centroCustoInput" list="centroCustoOptions" placeholder="Digite ou escolha um centro de custo" required aria-required="true">
                  <datalist id="centroCustoOptions">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <!-- Campo: Projeto (opcional) -->
                <div class="mb-3">
                  <label for="projetoInput" class="form-label" style="color: var(--black);">
                    Projeto
                  </label>
                  <input class="form-control" id="projetoInput" list="projetoOptions" placeholder="Digite ou escolha um projeto">
                  <datalist id="projetoOptions">
                    <option value="">Selecione</option>
                  </datalist>
                </div>
                <!-- Campo: Justificativa -->
                <div class="mb-3">
                  <label for="justificativa" class="form-label" style="color: var(--black);">
                    Justificativa <span style="color: red;">*</span>
                  </label>
                  <textarea class="form-control" id="justificativa" rows="3" placeholder="Justifique o lançamento desta despesa com os detalhes de acordo com procedimento PR-001." required aria-required="true"></textarea>
                </div>
                <!-- Campo: Inserir Anexo -->
                <div class="mb-3">
                  <label for="arquivo" class="form-label" style="color: var(--black);">
                    Inserir Anexo(s) <span style="color: red;">*</span>
                  </label>
                  <input type="file" class="form-control" id="arquivo" accept="image/png, image/jpeg" multiple>
                </div>
                <button type="submit" class="btn btn-primary" style="background-color: var(--theme-default); border-color: var(--shape-border);">
                  Criar Lançamento
                </button>
              </form>
              <div id="formError" class="mt-2" role="alert" aria-live="assertive" style="color: var(--danger-color);"></div>
            </div>
          </div>
        </div>
    `;
  
    // Inicializa o Select2 para os campos de Fornecedor e Conta Financeira
    if (window.$ && $.fn.select2) {
      $('#fornecedorSelect').select2({
        placeholder: "Selecione um fornecedor",
        width: '100%'
      });
      $('#contaFinanceiraSelect').select2({
        placeholder: "Selecione uma conta financeira",
        width: '100%'
      });
    }
  
    // Validação do campo Fornecedor via Select2 (valor lido do select)
    const fornecedorSelect = document.getElementById("fornecedorSelect");
    fornecedorSelect.addEventListener("change", function () {
      const inputValue = this.value.trim().toLowerCase();
      if (window.fornecedoresData && window.fornecedoresData.length > 0) {
        const found = window.fornecedoresData.some(
          forn => (`${forn.nome} - ${forn.cnpj}`).toLowerCase() === inputValue
        );
        if (!found) {
          this.setCustomValidity("Selecione um fornecedor válido.");
          this.reportValidity();
        } else {
          this.setCustomValidity("");
        }
      }
    });
  
    // Validação do campo Conta Financeira via Select2 (valor lido do select)
    const contaFinanceiraSelect = document.getElementById("contaFinanceiraSelect");
    contaFinanceiraSelect.addEventListener("change", function () {
      const inputValue = this.value.trim().toLowerCase();
      if (window.contasFinanceirasData && window.contasFinanceirasData.length > 0) {
        const found = window.contasFinanceirasData.some(
          conta => `${conta.estrutura} - ${conta.codigo} - ${conta.nome}`.toLowerCase() === inputValue
        );
        if (!found) {
          this.setCustomValidity("Selecione uma conta financeira válida (estrutura - código - nome).");
          this.reportValidity();
        } else {
          this.setCustomValidity("");
        }
      }
    });
  
    // Outras validações dos campos existentes
    const filialInput = document.getElementById("filialInput");
    filialInput.addEventListener("blur", function () {
      const inputValue = this.value.trim().toLowerCase();
      if (window.filiaisData && window.filiaisData.length > 0) {
        const found = window.filiaisData.some(fil => fil.nome.toLowerCase() === inputValue);
        if (!found) {
          this.setCustomValidity("Selecione uma filial válida.");
          this.reportValidity();
        } else {
          this.setCustomValidity("");
        }
      }
    });
    
    const centroCustoInput = document.getElementById("centroCustoInput");
    centroCustoInput.addEventListener("blur", function () {
      if (this.hasAttribute("readonly")) return;
      const inputValue = this.value.trim().toLowerCase();
      if (window.centrosData && window.centrosData.length > 0) {
        const found = window.centrosData.some(centro => centro.nome.toLowerCase() === inputValue);
        if (!found) {
          this.setCustomValidity("Selecione um centro de custo válido.");
          this.reportValidity();
        } else {
          this.setCustomValidity("");
        }
      }
    });
    
    const projetoInput = document.getElementById("projetoInput");
    projetoInput.addEventListener("blur", function () {
      if (this.value.trim() === "") {
        this.setCustomValidity("");
        return;
      }
      const inputValue = this.value.trim().toLowerCase();
      if (window.projetosData && window.projetosData.length > 0) {
        const found = window.projetosData.some(proj => proj.nome.toLowerCase() === inputValue);
        if (!found) {
          this.setCustomValidity("Selecione um projeto válido.");
          this.reportValidity();
        } else {
          this.setCustomValidity("");
        }
      }
    });
    
    const valorInput = document.getElementById("valor");
    valorInput.addEventListener("keypress", function (e) {
      const char = String.fromCharCode(e.which);
      if (!/[\d,]/.test(char)) {
        e.preventDefault();
      }
    });
    valorInput.addEventListener("blur", function () {
      let input = this.value.replace(/[^0-9,.-]/g, "");
      input = input.replace(",", ".");
      const numericValue = parseFloat(input);
      if (!isNaN(numericValue)) {
        this.value = numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    });
    
    // Carrega os dados dentro de AuthService.onAuthChange para evitar duplicações
    AuthService.onAuthChange((user) => {
      if (user) {
        document.getElementById("form-section").classList.remove("d-none");
    
        (async () => {
          try {
            // Filiais
            const datalistFilial = document.getElementById("filialOptions");
            datalistFilial.innerHTML = '<option value="">Selecione</option>';
            window.filiaisData = await listFiliais(AuthService);
            if (window.filiaisData.length === 1) {
              const fil = window.filiaisData[0];
              const filialInput = document.getElementById("filialInput");
              filialInput.value = fil.nome;
              filialInput.setAttribute("readonly", "true");
            } else {
              window.filiaisData.forEach((fil) => {
                const option = document.createElement("option");
                option.value = fil.nome;
                datalistFilial.appendChild(option);
              });
            }
          } catch (error) {
            console.error("Erro ao carregar filiais:", handleError(error, "Filiais"));
          }
        })();
    
        (async () => {
          try {
            // Centros de Custo
            const datalist = document.getElementById("centroCustoOptions");
            datalist.innerHTML = '<option value="">Selecione</option>';
            window.centrosData = await listCentrosCustos(AuthService);
            if (window.centrosData.length === 1) {
              const centro = window.centrosData[0];
              const centroInput = document.getElementById("centroCustoInput");
              centroInput.value = centro.nome;
              centroInput.setAttribute("readonly", "true");
            } else {
              window.centrosData.forEach((centro) => {
                const option = document.createElement("option");
                option.value = centro.nome;
                datalist.appendChild(option);
              });
            }
          } catch (error) {
            console.error("Erro ao carregar centros de custo:", handleError(error, "Centros de Custo"));
          }
        })();
    
        (async () => {
          try {
            // Contas Financeiras - Preenche o select para uso do Select2
            const contaSelect = document.getElementById("contaFinanceiraSelect");
            contaSelect.innerHTML = '<option value="">Selecione</option>';
            window.contasFinanceirasData = await listContasFinanceiras(AuthService);
            if (window.contasFinanceirasData.length === 1) {
              const conta = window.contasFinanceirasData[0];
              const valueText = `${conta.estrutura} - ${conta.codigo} - ${conta.nome}`;
              contaSelect.innerHTML = `<option value="${valueText}">${valueText}</option>`;
              contaSelect.setAttribute("readonly", "true");
            } else {
              window.contasFinanceirasData.forEach((conta) => {
                const option = document.createElement("option");
                const valueText = `${conta.estrutura} - ${conta.codigo} - ${conta.nome}`;
                option.value = valueText;
                option.textContent = valueText;
                contaSelect.appendChild(option);
              });
            }
            // Após preencher o select, dispara o evento de atualização se o Select2 estiver ativo.
            if (window.$ && $.fn.select2) {
              $('#contaFinanceiraSelect').trigger('change');
            }
          } catch (error) {
            console.error("Erro ao carregar contas financeiras:", handleError(error, "Contas Financeiras"));
          }
        })();
    
        (async () => {
          try {
            // Projetos
            const datalistProj = document.getElementById("projetoOptions");
            datalistProj.innerHTML = '<option value="">Selecione</option>';
            window.projetosData = await listProjetos(AuthService);
            window.projetosData.forEach((proj) => {
              const option = document.createElement("option");
              option.value = proj.nome;
              datalistProj.appendChild(option);
            });
          } catch (error) {
            console.error("Erro ao carregar projetos:", handleError(error, "Projetos"));
          }
        })();
    
        (async () => {
          try {
            // Fornecedores (populando o select utilizado pelo Select2)
            const fornecedorSelect = document.getElementById("fornecedorSelect");
            fornecedorSelect.innerHTML = '<option value="">Selecione</option>';
            window.fornecedoresData = await listFornecedores(AuthService);
            window.fornecedoresData.forEach((forn) => {
              const option = document.createElement("option");
              const valueText = `${forn.nome} - ${forn.cnpj}`;
              option.value = valueText;
              option.textContent = valueText;
              fornecedorSelect.appendChild(option);
            });
            if (window.$ && $.fn.select2) {
              $('#fornecedorSelect').trigger('change');
            }
          } catch (error) {
            console.error("Erro ao carregar fornecedores:", handleError(error, "Fornecedores"));
          }
        })();
      } else {
        content.innerHTML = `
          <div class="container-fluid" style="background-color: var(--body-color); color: var(--body-font-color);">
            <div class="alert alert-warning text-center mt-4">Autenticação necessária</div>
          </div>
        `;
      }
    });
    
    // Evento de submissão do formulário
    const lancamentoForm = document.getElementById("lancamentoForm");
    lancamentoForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formError = document.getElementById("formError");
      formError.innerHTML = "";
    
      const submitBtn = lancamentoForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;
    
      let errors = [];
    
      // Filial
      const filialInputValue = document.getElementById("filialInput").value.trim();
      let filialRecord = null;
      if (window.filiaisData && window.filiaisData.length > 0) {
        filialRecord = window.filiaisData.find(fil => fil.nome.toLowerCase() === filialInputValue.toLowerCase());
        if (!filialRecord) {
          errors.push("Filial inválida ou não encontrada");
        }
      } else {
        errors.push("Filiais não carregadas");
      }
    
      // Fornecedor
      const fornecedorSelectValue = document.getElementById("fornecedorSelect").value.trim();
      let fornecedorRecord = null;
      if (window.fornecedoresData && window.fornecedoresData.length > 0) {
        fornecedorRecord = window.fornecedoresData.find(forn => {
          const formattedFornec = `${forn.nome} - ${forn.cnpj}`;
          return formattedFornec.toLowerCase() === fornecedorSelectValue.toLowerCase();
        });
        if (!fornecedorRecord) {
          errors.push("Fornecedor inválido ou não encontrado");
        }
      } else {
        errors.push("Fornecedores não carregados");
      }
    
      // Conta Financeira
      const contaFinanceiraSelectValue = document.getElementById("contaFinanceiraSelect").value.trim();
      let contaFinanceiraRecord = null;
      if (window.contasFinanceirasData && window.contasFinanceirasData.length > 0) {
        contaFinanceiraRecord = window.contasFinanceirasData.find(conta =>
          `${conta.estrutura} - ${conta.codigo} - ${conta.nome}`.toLowerCase() === contaFinanceiraSelectValue.toLowerCase()
        );
        if (!contaFinanceiraRecord) {
          errors.push("Conta Financeira inválida ou não encontrada");
        }
      } else {
        errors.push("Contas Financeiras não carregadas");
      }
    
      // Outros campos do formulário
      const numeroDocumento = document.getElementById("numeroDocumento").value.trim();
      const tipoDocumento = document.getElementById("tipoDocumento").value;
      const dataEmissao = document.getElementById("dataEmissao").value;
      const valor = document.getElementById("valor").value.trim();
      const formaPagamentoValue = document.getElementById("formaPagamento").value;
      const vencimento = document.getElementById("vencimento").value;
    
      const centroCustoInputValue = document.getElementById("centroCustoInput").value.trim();
      let centroCustoRecord = null;
      if (window.centrosData && window.centrosData.length > 0) {
        centroCustoRecord = window.centrosData.find(centro => centro.nome.toLowerCase() === centroCustoInputValue.toLowerCase());
        if (!centroCustoRecord) {
          errors.push("Centro de Custo inválido ou não encontrado");
        }
      } else {
        errors.push("Centros de Custo não carregados");
      }
    
      const projetoInputValue = document.getElementById("projetoInput").value.trim();
      let projetoRecord = null;
      if (projetoInputValue) {
        if (window.projetosData && window.projetosData.length > 0) {
          projetoRecord = window.projetosData.find(proj => proj.nome.toLowerCase() === projetoInputValue.toLowerCase());
          if (!projetoRecord) {
            errors.push("Projeto inválido ou não encontrado");
          }
        } else {
          errors.push("Projetos não carregados");
        }
      }
    
      const justificativa = document.getElementById("justificativa").value.trim();
      if (!justificativa) {
        errors.push("Justificativa");
      }
    
      const arquivoInput = document.getElementById("arquivo");
      if (arquivoInput.files.length === 0) {
        errors.push("Pelo menos um anexo é obrigatório");
      }
    
      if (dataEmissao && isNaN(Date.parse(dataEmissao))) {
        errors.push("Data de Emissão inválida");
      }
      if (vencimento && isNaN(Date.parse(vencimento))) {
        errors.push("Vencimento inválido");
      }
      if (valor && isNaN(parseFloat(valor.replace(/[^\d,.-]/g, "").replace(",", ".")))) {
        errors.push("Valor deve ser numérico");
      }
      if (dataEmissao && new Date(dataEmissao) > new Date()) {
        errors.push("Data de Emissão não pode ser superior à data atual");
      }
    
      if (errors.length > 0) {
        formError.innerHTML = `<div class="alert alert-danger">
                <strong>Por favor, corrija os seguintes campos:</strong>
                <ul>${errors.map(err => `<li>${err}</li>`).join("")}</ul>
            </div>`;
        const fields = ["filialInput", "fornecedorSelect", "contaFinanceiraSelect", "numeroDocumento", "tipoDocumento", "dataEmissao", "valor", "formaPagamento", "vencimento", "centroCustoInput", "justificativa"];
        for (let fieldId of fields) {
          const field = document.getElementById(fieldId);
          if (field && !field.value.trim()) {
            field.focus();
            break;
          }
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
    
      const dataInclusao = formatDateISO(new Date());
    
      // Monta o payload conforme o novo formato
      let payload = {
        app_id: "empresa_vtc_log",
        status: "Pendente",
        valor: parseFloat(valor.replace(/[^\d,.-]/g, "").replace(",", ".")),
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        forma_pagamento: formaPagamentoValue,
        justificativa: justificativa,
        data_emissao: dataEmissao,
        data_vencimento: vencimento,
        data_inclusao: dataInclusao,
        usuario_inclusao: AuthService.user.email,
        fornecedor_nome: fornecedorRecord.nome,
        fornecedor_cnpj: fornecedorRecord.cnpj,
        fornecedor_id_benner: fornecedorRecord.id_benner,
        fornecedor_uuid: fornecedorRecord.uuid,
        filial_nome: filialRecord.nome,
        filial_id_benner: filialRecord.id_benner,
        filial_uuid: filialRecord.uuid,
        projeto_nome: projetoRecord ? projetoRecord.nome : "",
        projeto_id_benner: projetoRecord ? projetoRecord.id_benner : "",
        projeto_uuid: projetoRecord ? projetoRecord.uuid : "",
        centro_custo_nome: centroCustoRecord.nome,
        centro_custo_id_benner: centroCustoRecord.id_benner,
        centro_custo_uuid: centroCustoRecord.uuid,
        conta_financeira_nome: contaFinanceiraRecord.nome,
        conta_financeira_codigo: contaFinanceiraRecord.codigo,
        conta_financeira_estrutura: contaFinanceiraRecord.estrutura,
        conta_financeira_id_benner: contaFinanceiraRecord.id_benner,
        conta_financeira_uuid: contaFinanceiraRecord.uuid,
        uid: AuthService.user.uid
      };
    
      try {
        const files = Array.from(arquivoInput.files);
        const allowedTypes = ["image/png", "image/jpeg"];
        const MAX_FILE_SIZE = 4096 * 1024;
        for (const file of files) {
          if (!allowedTypes.includes(file.type)) {
            throw new Error(`Arquivo ${file.name} possui formato inválido. Apenas PNG, JPG e JPEG são permitidos.`);
          }
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`Arquivo ${file.name} excede o tamanho máximo de 4096KB.`);
          }
        }
    
        const uploadResponses = await Promise.all(
          Array.from(arquivoInput.files).map(async (file) => {
            return uploadArquivo(AuthService, file);
          })
        );
        let anexosArray = [];
        for (const uploadResponse of uploadResponses) {
          let parsedResponse = typeof uploadResponse === "string"
            ? JSON.parse(uploadResponse)
            : uploadResponse;
          let resultObj = Array.isArray(parsedResponse) && parsedResponse.length > 0
            ? parsedResponse[0]
            : parsedResponse;
    
          if (resultObj.status_validacao && resultObj.status_validacao.trim() === "inválido") {
            let errorMessage = "Mensagem: " + (resultObj.mensagem ? resultObj.mensagem.trim() : "Não definida.");
            if (resultObj.acao_recomendada) {
              errorMessage += "<br>Ação Recomendada: " + resultObj.acao_recomendada.trim();
            }
            throw new Error(errorMessage);
          }
    
          if (!resultObj.data) {
            if (resultObj.mensagem && resultObj.acao_recomendada) {
              let errorMessage = "Mensagem: " + resultObj.mensagem.trim() +
                "<br>Ação Recomendada: " + resultObj.acao_recomendada.trim();
              throw new Error(errorMessage);
            } else {
              throw new Error("Resposta de upload inválida");
            }
          }
    
          const responseData = JSON.parse(resultObj.data);
          const filename = responseData.filename;
          anexosArray.push({
            url: filename,
            categoria: "comprovante"
          });
        }
        payload.anexo = anexosArray;
      } catch (uploadError) {
        const newFileInput = arquivoInput.cloneNode(true);
        arquivoInput.parentNode.replaceChild(newFileInput, arquivoInput);
        formError.innerHTML = `<div class="alert alert-danger">
                Erro ao fazer upload dos anexos:<br> ${handleError(uploadError, "Upload")}
            </div>`;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }
    
      try {
        const result = await createLancamento(AuthService, payload);
        if (!result || !result.id) {
          throw new Error("A resposta da API não contém os dados esperados.");
        }
        alert("Lançamento criado com sucesso! ID: " + result.id);
        lancamentoForm.reset();
        resetFormFields();
      } catch (error) {
        formError.innerHTML = `<div class="alert alert-danger">
                Erro ao criar lançamento: ${handleError(error, "CreateLancamento")}
            </div>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
    
  registerRoute("#financeiro-lancamento-create-v2", renderFinanceiroLancamentoCreateV2);