/**
 * @file financeiro-lancamento-create-v2.js
 * @description Responsável por renderizar a página de "Financeiro - Lançamento Create V2" no módulo financeiro,
 * permitindo a criação de novos lançamentos via formulário e enviando os dados para a API.
 * Os campos Filial, Fornecedor, N° Documento, Tipo de Documento, Data de Emissão, Valor Bruto,
 * Forma de Pagamento, Vencimento, Centro de Custo, Projeto, Justificativa e Inserir Anexo são apresentados
 * e serão enviados para o JSONB de dados.
 *
 * API de lançamento utilizada: https://n8n.power.tec.br/webhook-test/voetur/v1/lancamentos
 */

// Função centralizada para tratamento de erros
function handleError(error, context = 'Erro') {
    console.error(`[${context}]`, error);
    return error.message || 'Ocorreu um erro inesperado';
  }
  
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
  
  // Função auxiliar para formatar a data no padrão ISO 8601 "yyyy-mm-dd hh:mm:ss"
  function formatDateISO(dateObj) {
    const pad = (num) => num.toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    const seconds = pad(dateObj.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  export async function renderFinanceiroLancamentoCreateV2() {
    const content = document.getElementById("content");
    // Cabeçalho e breadcrumb
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
        
        <!-- Área do Formulário -->
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
                <!-- Campo: Fornecedor -->
                <div class="mb-3">
                  <label for="fornecedorInput" class="form-label" style="color: var(--black);">
                    Fornecedor <span style="color: red;">*</span>
                  </label>
                  <input class="form-control" id="fornecedorInput" list="fornecedorOptions" placeholder="Digite ou escolha um fornecedor" required aria-required="true">
                  <datalist id="fornecedorOptions">
                    <option value="">Selecione</option>
                  </datalist>
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
                  <input type="number" step="0.01" class="form-control" id="valor" placeholder="0,00" required aria-required="true">
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
                <!-- Campo: Projeto (não obrigatório) -->
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
      </div>
    `;
      
    // Evento de submissão do formulário com feedback visual (loading)
    const lancamentoForm = document.getElementById("lancamentoForm");
    lancamentoForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formError = document.getElementById("formError");
      formError.innerHTML = "";
          
      // Desabilita o botão e mostra loading
      const submitBtn = lancamentoForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;
          
      // Armazena os erros
      let errors = [];
          
      // Coleta os valores do formulário
      const filialInputValue = document.getElementById("filialInput").value.trim();
      let filial = "";
      if (window.filiaisData && window.filiaisData.length > 0) {
        const filialSelecionada = window.filiaisData.find(fil => fil.nome.toLowerCase() === filialInputValue.toLowerCase());
        if (filialSelecionada) {
          filial = filialSelecionada.uuid;
        } else {
          errors.push("Filial inválida ou não encontrada");
        }
      } else {
        errors.push("Filiais não carregadas");
      }
          
      const fornecedorInputValue = document.getElementById("fornecedorInput").value.trim();
      let fornecedor = "";
      if (window.fornecedoresData && window.fornecedoresData.length > 0) {
        const fornecedorSelecionado = window.fornecedoresData.find(forn => {
          const formattedFornec = `${forn.nome} - ${forn.cnpj}`;
          return formattedFornec.toLowerCase() === fornecedorInputValue.toLowerCase();
        });
        if (fornecedorSelecionado) {
          fornecedor = fornecedorSelecionado.uuid;
        } else {
          errors.push("Fornecedor inválido ou não encontrado");
        }
      } else {
        errors.push("Fornecedores não carregados");
      }
          
      const numeroDocumento = document.getElementById("numeroDocumento").value.trim();
      const tipoDocumento = document.getElementById("tipoDocumento").value;
      const dataEmissao = document.getElementById("dataEmissao").value;
      const valor = document.getElementById("valor").value.trim();
      const formaPagamentoValue = document.getElementById("formaPagamento").value;
      const vencimento = document.getElementById("vencimento").value;
      const centroCustoInputValue = document.getElementById("centroCustoInput").value.trim();
      let centroCusto = "";
      if (window.centrosData && window.centrosData.length > 0) {
        const centroSelecionado = window.centrosData.find(centro => centro.nome.toLowerCase() === centroCustoInputValue.toLowerCase());
        if (centroSelecionado) {
          centroCusto = centroSelecionado.uuid;
        } else {
          errors.push("Centro de Custo inválido ou não encontrado");
        }
      } else {
        errors.push("Centros de Custo não carregados");
      }
          
      const projetoInputValue = document.getElementById("projetoInput").value.trim();
      let projeto = "";
      if (projetoInputValue) {
        if (window.projetosData && window.projetosData.length > 0) {
          const projetoSelecionado = window.projetosData.find(proj => proj.nome.toLowerCase() === projetoInputValue.toLowerCase());
          if (projetoSelecionado) {
            projeto = projetoSelecionado.uuid;
          } else {
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
          
      // Validação dos campos obrigatórios
      if (!filialInputValue) errors.push("Filial");
      if (!fornecedorInputValue) errors.push("Fornecedor");
      if (!numeroDocumento) errors.push("N° Documento");
      if (!tipoDocumento) errors.push("Tipo de Documento");
      if (!dataEmissao) errors.push("Data de Emissão");
      if (!valor) errors.push("Valor Bruto");
      if (!formaPagamentoValue) errors.push("Forma de Pagamento");
      if (!vencimento) errors.push("Vencimento");
      if (!centroCustoInputValue) errors.push("Centro de Custo");
      if (!justificativa) errors.push("Justificativa");
          
      if (arquivoInput.files.length === 0) {
        errors.push("Pelo menos um anexo é obrigatório");
      }
          
      if (dataEmissao && isNaN(Date.parse(dataEmissao))) {
        errors.push("Data de Emissão inválida");
      }
      if (vencimento && isNaN(Date.parse(vencimento))) {
        errors.push("Vencimento inválido");
      }
      if (valor && isNaN(parseFloat(valor))) {
        errors.push("Valor deve ser numérico");
      }
          
      if (dataEmissao && new Date(dataEmissao) > new Date()) {
        errors.push("Data de Emissão não pode ser superior à data atual");
      }
          
      if (errors.length > 0) {
        formError.innerHTML = `<div class="alert alert-danger">
          <strong>Por favor, corrija os seguintes campos:</strong>
          <ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul>
        </div>`;
        const fields = ["filialInput", "fornecedorInput", "numeroDocumento", "tipoDocumento", "dataEmissao", "valor", "formaPagamento", "vencimento", "centroCustoInput", "justificativa"];
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
          
      let payload = {
        dados: {
          uid: AuthService.user.uid,
          app_id: "empresaVTCLog",
          filial: filial,
          fornecedor: fornecedor,
          numeroDocumento: numeroDocumento,
          tipoDocumento: tipoDocumento,
          dataEmissao: dataEmissao,
          valor: parseFloat(valor),
          forma_pagamento: formaPagamentoValue,
          vencimento: vencimento,
          centro_custo: centroCusto,
          projeto: projeto,
          email: AuthService.user.email,
          justificativa: justificativa,
          status: "Pendente",
          data_inclusao: dataInclusao
        }
      };
          
      try {
        const files = Array.from(arquivoInput.files);
        if (files.length === 0) {
          throw new Error("É necessário enviar pelo menos um anexo.");
        }
        // Validação de tipo e tamanho dos arquivos
        const allowedTypes = ["image/png", "image/jpeg"];
        const MAX_FILE_SIZE = 4096 * 1024; // 4096KB => 4MB
        for (const file of files) {
          if (!allowedTypes.includes(file.type)) {
            throw new Error(`Arquivo ${file.name} possui formato inválido. Apenas PNG, JPG e JPEG são permitidos.`);
          }
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`Arquivo ${file.name} excede o tamanho máximo de 4096KB.`);
          }
        }
        
        // Envia os arquivos diretamente; o objeto File já é um Blob nativo
        const uploadResponses = await Promise.all(
          files.map(async file => {
            return uploadArquivo(AuthService, file);
          })
        );
        let anexosArray = [];
        for (const uploadResponse of uploadResponses) {
          let parsedResponse = typeof uploadResponse === "string" 
            ? JSON.parse(uploadResponse) 
            : uploadResponse;
          let resultObj =
            Array.isArray(parsedResponse) && parsedResponse.length > 0
              ? parsedResponse[0]
              : parsedResponse;
        
          // Se resultObj.status_validacao (após trim) for "inválido", formata a mensagem para exibição
          if (
            resultObj.status_validacao &&
            resultObj.status_validacao.trim() === "inválido"
          ) {
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
        // Recria o campo de arquivo para garantir nova seleção
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
      } catch (error) {
        formError.innerHTML = `<div class="alert alert-danger">
          Erro ao criar lançamento: ${handleError(error, "CreateLancamento")}
        </div>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
          
    AuthService.onAuthChange((user) => {
      if (user) {
        document.getElementById("form-section").classList.remove("d-none");
          
        (async () => {
          try {
            const datalistFilial = document.getElementById("filialOptions");
            datalistFilial.innerHTML = '<option value="">Selecione</option>';
            window.filiaisData = await listFiliais(AuthService);
            window.filiaisData.forEach((fil) => {
              const option = document.createElement("option");
              option.value = fil.nome;
              datalistFilial.appendChild(option);
            });
          } catch (error) {
            console.error("Erro ao carregar filiais:", handleError(error, "Filiais"));
          }
        })();
          
        (async () => {
          try {
            const datalist = document.getElementById("centroCustoOptions");
            datalist.innerHTML = '<option value="">Selecione</option>';
            window.centrosData = await listCentrosCustos(AuthService);
            window.centrosData.forEach((centro) => {
              const option = document.createElement("option");
              option.value = centro.nome;
              datalist.appendChild(option);
            });
          } catch (error) {
            console.error("Erro ao carregar centros de custo:", handleError(error, "Centros de Custo"));
          }
        })();
          
        (async () => {
          try {
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
            const datalistFornecedores = document.getElementById("fornecedorOptions");
            datalistFornecedores.innerHTML = '<option value="">Selecione</option>';
            window.fornecedoresData = await listFornecedores(AuthService);
            window.fornecedoresData.forEach((forn) => {
              const option = document.createElement("option");
              option.value = `${forn.nome} - ${forn.cnpj}`;
              datalistFornecedores.appendChild(option);
            });
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
  }
          
  registerRoute("#financeiro-lancamento-create-v2", renderFinanceiroLancamentoCreateV2);