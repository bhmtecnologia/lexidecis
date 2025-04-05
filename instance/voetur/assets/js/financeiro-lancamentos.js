/**
 * @file financeiro-lancamentos.js
 * @description Responsável por renderizar a página de "Financeiro - Lançamentos" no módulo financeiro,
 * permitindo a criação de novos lançamentos via formulário e enviando os dados para a API.
 * Os campos Filial, Fornecedor, N° Documento, Tipo de Documento, Data de Emissão, Valor, Vencimento, Centro de Custo, Projeto,
 * Observação e Inserir Anexo são apresentados e serão enviados para o JSONB de dados.
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
import { createLancamento, uploadArquivo, listCentrosCustos, listProjetos, listFiliais, listFornecedores } from "./api.js";

export async function renderFinanceiroLancamentos() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Financeiro - Lançamentos</h2>
            <p class="mb-0 text-title-gray">Crie e gerencie novos lançamentos de pagamento</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Financeiro</li>
              <li class="breadcrumb-item active">Lançamentos</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Área do Formulário -->
      <div id="form-section" class="mt-4">
        <div class="card">
          <div class="card-body">
            <form id="lancamentoForm">
              <!-- 1. Filial (Input com Datalist) -->
              <div class="mb-3">
                <label for="filialInput" class="form-label">Filial</label>
                <input class="form-control" id="filialInput" list="filialOptions" placeholder="Digite ou escolha uma filial" required aria-required="true">
                <datalist id="filialOptions">
                  <option value="">Selecione</option>
                </datalist>
              </div>
              <!-- 2. Fornecedor (Input com Datalist) -->
              <div class="mb-3">
                <label for="fornecedorInput" class="form-label">Fornecedor</label>
                <input class="form-control" id="fornecedorInput" list="fornecedorOptions" placeholder="Digite ou escolha um fornecedor" required aria-required="true">
                <datalist id="fornecedorOptions">
                  <option value="">Selecione</option>
                </datalist>
              </div>
              <!-- 3. N° Documento (Campo de Texto) -->
              <div class="mb-3">
                <label for="numeroDocumento" class="form-label">N° Documento</label>
                <input type="text" class="form-control" id="numeroDocumento" placeholder="Digite o número do documento" required aria-required="true">
              </div>
              <!-- 4. Tipo de Documento (Lista Suspensa) -->
              <div class="mb-3">
                <label for="tipoDocumento" class="form-label">Tipo de Documento</label>
                <select class="form-select" id="tipoDocumento" required aria-required="true">
                  <option value="">Selecione</option>
                  <option value="Nota Fiscal">Nota Fiscal</option>
                  <option value="Fatura">Fatura</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Reembolso">Reembolso</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <!-- 5. Data de Emissão (Seleção de Data) -->
              <div class="mb-3">
                <label for="dataEmissao" class="form-label">Data de Emissão</label>
                <input type="date" class="form-control" id="dataEmissao" required aria-required="true">
              </div>
              <!-- 6. Valor (Número com máscara financeira) -->
              <div class="mb-3">
                <label for="valor" class="form-label">Valor</label>
                <input type="number" step="0.01" class="form-control" id="valor" placeholder="0.00" required aria-required="true">
              </div>
              <!-- 7. Vencimento (Seleção de Data) -->
              <div class="mb-3">
                <label for="vencimento" class="form-label">Vencimento</label>
                <input type="date" class="form-control" id="vencimento" required aria-required="true">
              </div>
              <!-- 8. Centro de Custo (Input com Datalist) -->
              <div class="mb-3">
                <label for="centroCustoInput" class="form-label">Centro de Custo</label>
                <input class="form-control" id="centroCustoInput" list="centroCustoOptions" placeholder="Digite ou escolha um centro de custo" required aria-required="true">
                <datalist id="centroCustoOptions">
                  <option value="">Selecione</option>
                </datalist>
              </div>
              <!-- 9. Projeto (Input com Datalist) -->
              <div class="mb-3">
                <label for="projetoInput" class="form-label">Projeto</label>
                <input class="form-control" id="projetoInput" list="projetoOptions" placeholder="Digite ou escolha um projeto" required aria-required="true">
                <datalist id="projetoOptions">
                  <option value="">Selecione</option>
                </datalist>
              </div>
              <!-- 10. Observação (Campo Aberto com 3 linhas) -->
              <div class="mb-3">
                <label for="observacao" class="form-label">Observação</label>
                <textarea class="form-control" id="observacao" rows="3"></textarea>
              </div>
              <!-- 11. Inserir Anexo (Upload) - Permite múltiplos anexos -->
              <div class="mb-3">
                <label for="arquivo" class="form-label">Inserir Anexo</label>
                <input type="file" class="form-control" id="arquivo" accept="image/*" multiple>
              </div>
              <button type="submit" class="btn btn-primary">Criar Lançamento</button>
            </form>
            <div id="formError" class="mt-2" role="alert" aria-live="assertive"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Evento de submissão do formulário com feedback visual (loading)
  const lancamentoForm = document.getElementById('lancamentoForm');
  lancamentoForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formError = document.getElementById('formError');
    formError.innerHTML = '';

    // Desabilita o botão de submit e exibe um indicador de loading
    const submitBtn = lancamentoForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;

    // Cria um array para armazenar erros
    let errors = [];

    // Coleta dos valores do formulário
    const filialInputValue = document.getElementById('filialInput').value.trim();
    let filial = '';
    if (window.filiaisData && window.filiaisData.length > 0) {
      const filialSelecionada = window.filiaisData.find(fil => fil.nome.toLowerCase() === filialInputValue.toLowerCase());
      if (filialSelecionada) {
        filial = filialSelecionada.uuid;
      } else {
        errors.push('Filial inválida ou não encontrada');
      }
    } else {
      errors.push('Filiais não carregadas');
    }
    const fornecedorInputValue = document.getElementById('fornecedorInput').value.trim();
    let fornecedor = '';
    if (window.fornecedoresData && window.fornecedoresData.length > 0) {
      const fornecedorSelecionado = window.fornecedoresData.find(forn => 
        forn.nome.toLowerCase() === fornecedorInputValue.toLowerCase() ||
        forn.cnpj.replace(/[\.\-\/\s]/g, "").toLowerCase() === fornecedorInputValue.replace(/[\.\-\/\s]/g, "").toLowerCase()
      );
      if (fornecedorSelecionado) {
        fornecedor = fornecedorSelecionado.uuid;
      } else {
        errors.push('Fornecedor inválido ou não encontrado');
      }
    } else {
      errors.push('Fornecedores não carregados');
    }
    const numeroDocumento = document.getElementById('numeroDocumento').value.trim();
    const tipoDocumento = document.getElementById('tipoDocumento').value;
    const dataEmissao = document.getElementById('dataEmissao').value;
    const valor = document.getElementById('valor').value.trim();
    const vencimento = document.getElementById('vencimento').value;
    const centroCustoInputValue = document.getElementById('centroCustoInput').value.trim();
    let centroCusto = '';
    if (window.centrosData && window.centrosData.length > 0) {
      const centroSelecionado = window.centrosData.find(centro => centro.nome.toLowerCase() === centroCustoInputValue.toLowerCase());
      if (centroSelecionado) {
        centroCusto = centroSelecionado.uuid;
      } else {
        errors.push('Centro de Custo inválido ou não encontrado');
      }
    } else {
      errors.push('Centros de Custo não carregados');
    }
    const projetoInputValue = document.getElementById('projetoInput').value.trim();
    let projeto = '';
    if (window.projetosData && window.projetosData.length > 0) {
      const projetoSelecionado = window.projetosData.find(proj => proj.nome.toLowerCase() === projetoInputValue.toLowerCase());
      if (projetoSelecionado) {
        projeto = projetoSelecionado.uuid;
      } else {
        errors.push('Projeto inválido ou não encontrado');
      }
    } else {
      errors.push('Projetos não carregados');
    }
    const observacao = document.getElementById('observacao').value.trim();
    const arquivoInput = document.getElementById('arquivo');

    // Validação de campos obrigatórios com mensagens amigáveis
    if (!filialInputValue) errors.push("Filial");
    if (!fornecedorInputValue) errors.push("Fornecedor");
    if (!numeroDocumento) errors.push("N° Documento");
    if (!tipoDocumento) errors.push("Tipo de Documento");
    if (!dataEmissao) errors.push("Data de Emissão");
    if (!valor) errors.push("Valor");
    if (!vencimento) errors.push("Vencimento");
    if (!centroCustoInputValue) errors.push("Centro de Custo");
    if (!projetoInputValue) errors.push("Projeto");

    // O formulário deve ter pelo menos um anexo
    if (arquivoInput.files.length === 0) {
      errors.push("Pelo menos um anexo é obrigatório");
    }

    // Validação de formato para campos de data e valor
    if (dataEmissao && isNaN(Date.parse(dataEmissao))) {
      errors.push("Data de Emissão inválida");
    }
    if (vencimento && isNaN(Date.parse(vencimento))) {
      errors.push("Vencimento inválido");
    }
    if (valor && isNaN(parseFloat(valor))) {
      errors.push("Valor deve ser numérico");
    }

    // Validação para que a data de emissão não seja superior à data atual
    if (dataEmissao && new Date(dataEmissao) > new Date()) {
      errors.push("Data de Emissão não pode ser superior à data atual");
    }

    if (errors.length > 0) {
      formError.innerHTML = `<div class="alert alert-danger"><strong>Por favor, corrija os seguintes campos:</strong><ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul></div>`;
      // Foca no primeiro campo vazio
      const fields = ["filialInput", "fornecedorInput", "numeroDocumento", "tipoDocumento", "dataEmissao", "valor", "vencimento", "centroCustoInput", "projetoInput"];
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

    // Preparação do objeto payload para a API de lançamento
    let payload = {
      dados: {
        uid: AuthService.user.uid,
        app_id: "empresaXYZ",
        filial: filial,
        fornecedor: fornecedor,
        numeroDocumento: numeroDocumento,
        tipoDocumento: tipoDocumento,
        dataEmissao: dataEmissao,
        valor: parseFloat(valor),
        vencimento: vencimento,
        centro_custo: centroCusto,
        projeto: projeto,
        observacao: observacao,
        status: "pendente"
      }
    };

    // Processa o upload de múltiplos anexos
    try {
      const files = Array.from(arquivoInput.files);
      if (files.length === 0) {
        throw new Error("É necessário enviar pelo menos um anexo.");
      }
      const uploadResponses = await Promise.all(files.map(file => uploadArquivo(AuthService, file)));
      let anexosArray = [];
      for (const uploadResponse of uploadResponses) {
        let parsedResponse = typeof uploadResponse === 'string' ? JSON.parse(uploadResponse) : uploadResponse;
        let uploadData;
        if (Array.isArray(parsedResponse) && parsedResponse.length > 0 && parsedResponse[0].data) {
          uploadData = parsedResponse[0].data;
        } else if (parsedResponse.data) {
          uploadData = parsedResponse.data;
        }
        if (!uploadData) {
          throw new Error("Resposta de upload inválida");
        }
        const responseData = JSON.parse(uploadData);
        const filename = responseData.filename;
        anexosArray.push({
          url: filename,
          categoria: "comprovante"
        });
      }
      payload.anexo = anexosArray;
    } catch (uploadError) {
      formError.innerHTML = `<div class="alert alert-danger">Erro ao fazer upload dos anexos: ${handleError(uploadError, "Upload")}</div>`;
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
      formError.innerHTML = `<div class="alert alert-danger">Erro ao criar lançamento: ${handleError(error, "CreateLancamento")}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  AuthService.onAuthChange((user) => {
    if (user) {
      document.getElementById('form-section').classList.remove('d-none');
      
      // Popula o datalist de Filiais com dados da API
      (async () => {
        try {
          const datalistFilial = document.getElementById('filialOptions');
          datalistFilial.innerHTML = '<option value="">Selecione</option>';
          window.filiaisData = await listFiliais(AuthService);
          window.filiaisData.forEach(fil => {
            const option = document.createElement('option');
            option.value = fil.nome;
            datalistFilial.appendChild(option);
          });
        } catch (error) {
          console.error('Erro ao carregar filiais:', handleError(error, "Filiais"));
        }
      })();
      
      // Popula o datalist de Centro de Custo com dados da API
      (async () => {
        try {
          const datalist = document.getElementById('centroCustoOptions');
          datalist.innerHTML = '<option value="">Selecione</option>';
          window.centrosData = await listCentrosCustos(AuthService);
          window.centrosData.forEach(centro => {
            const option = document.createElement('option');
            option.value = centro.nome;
            datalist.appendChild(option);
          });
        } catch (error) {
          console.error('Erro ao carregar centros de custo:', handleError(error, "Centros de Custo"));
        }
      })();
      
      // Popula o datalist de Projetos com dados da API
      (async () => {
        try {
          const datalistProj = document.getElementById('projetoOptions');
          datalistProj.innerHTML = '<option value="">Selecione</option>';
          window.projetosData = await listProjetos(AuthService);
          window.projetosData.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.nome;
            datalistProj.appendChild(option);
          });
        } catch (error) {
          console.error('Erro ao carregar projetos:', handleError(error, "Projetos"));
        }
      })();
      
      // Popula o datalist de Fornecedores com dados da API
      (async () => {
        try {
          const datalistFornecedores = document.getElementById('fornecedorOptions');
          datalistFornecedores.innerHTML = '<option value="">Selecione</option>';
          window.fornecedoresData = await listFornecedores(AuthService);
          window.fornecedoresData.forEach(forn => {
            const option = document.createElement('option');
            option.value = forn.nome;
            datalistFornecedores.appendChild(option);
          });
        } catch (error) {
          console.error('Erro ao carregar fornecedores:', handleError(error, "Fornecedores"));
        }
      })();
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

registerRoute('#financeiro-lancamentos', renderFinanceiroLancamentos);