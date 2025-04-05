/**
 * @file financeiro-lancamentos.js
 * @description Responsável por renderizar a página de "Financeiro - Lançamentos" no módulo financeiro,
 * permitindo a criação de novos lançamentos via formulário e enviando os dados para a API.
 * Os campos Filial, Fornecedor, N° Documento, Tipo de Documento, Data de Emissão, Valor, Vencimento, Centro de Custo, Projeto,
 * Observação e Inserir Anexo são apresentados e serão enviados para o JSONB de dados.
 *
 * API de lançamento utilizada: https://n8n.power.tec.br/webhook-test/voetur/v1/lancamentos
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { createLancamento, uploadArquivo } from "./api.js";

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
              <!-- 1. Filial (Lista Suspensa) -->
              <div class="mb-3">
                <label for="filial" class="form-label">Filial</label>
                <select class="form-select" id="filial" required>
                  <option value="">Selecione</option>
                  <option value="Filial 1">Filial 1</option>
                  <option value="Filial 2">Filial 2</option>
                </select>
              </div>
              <!-- 2. Fornecedor (Lista Suspensa) -->
              <div class="mb-3">
                <label for="fornecedor" class="form-label">Fornecedor</label>
                <select class="form-select" id="fornecedor" required>
                  <option value="">Selecione</option>
                  <option value="Fornecedor 1">Fornecedor 1</option>
                  <option value="Fornecedor 2">Fornecedor 2</option>
                </select>
              </div>
              <!-- 3. N° Documento (Campo de Texto) -->
              <div class="mb-3">
                <label for="numeroDocumento" class="form-label">N° Documento</label>
                <input type="text" class="form-control" id="numeroDocumento" placeholder="Digite o número do documento" required>
              </div>
              <!-- 4. Tipo de Documento (Lista Suspensa) -->
              <div class="mb-3">
                <label for="tipoDocumento" class="form-label">Tipo de Documento</label>
                <select class="form-select" id="tipoDocumento" required>
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
                <input type="date" class="form-control" id="dataEmissao" required>
              </div>
              <!-- 6. Valor (Número com máscara financeira) -->
              <div class="mb-3">
                <label for="valor" class="form-label">Valor</label>
                <input type="text" class="form-control" id="valor" placeholder="0.00" required>
              </div>
              <!-- 7. Vencimento (Seleção de Data) -->
              <div class="mb-3">
                <label for="vencimento" class="form-label">Vencimento</label>
                <input type="date" class="form-control" id="vencimento" required>
              </div>
              <!-- 8. Centro de Custo (Lista Suspensa) -->
              <div class="mb-3">
                <label for="centroCusto" class="form-label">Centro de Custo</label>
                <select class="form-select" id="centroCusto" required>
                  <option value="">Selecione</option>
                  <option value="DIRETORIA_BR">DIRETORIA_BR</option>
                  <option value="Diretoria Jurídica">Diretoria Jurídica</option>
                  <option value="Jurídico Geral">Jurídico Geral</option>
                  <option value="SGI">SGI</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Diretoria Financeira">Diretoria Financeira</option>
                  <option value="Contábil">Contábil</option>
                  <option value="Contas a Pagar">Contas a Pagar</option>
                  <option value="Contas a Receber / Cobrança">Contas a Receber / Cobrança</option>
                  <option value="Suprimentos">Suprimentos</option>
                  <option value="RH">RH</option>
                  <option value="DP">DP</option>
                  <option value="SESMT">SESMT</option>
                  <option value="Infraestrutura">Infraestrutura</option>
                  <option value="Publicidade e Comunicação">Publicidade e Comunicação</option>
                  <option value="Licitações">Licitações</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Faturamento Público">Faturamento Público</option>
                  <option value="Garantia da Qualidade">Garantia da Qualidade</option>
                  <option value="Monitoramento">Monitoramento</option>
                  <option value="Refrigerado">Refrigerado</option>
                  <option value="Climatizado">Climatizado</option>
                  <option value="Terrestre">Terrestre</option>
                  <option value="Facilities">Facilities</option>
                </select>
              </div>
              <!-- 9. Projeto (Lista Suspensa) -->
              <div class="mb-3">
                <label for="projeto" class="form-label">Projeto</label>
                <select class="form-select" id="projeto" required>
                  <option value="">Selecione</option>
                  <option value="Projeto A">Projeto A</option>
                  <option value="Projeto B">Projeto B</option>
                  <option value="Projeto C">Projeto C</option>
                </select>
              </div>
              <!-- 10. Observação (Campo Aberto com 3 linhas) -->
              <div class="mb-3">
                <label for="observacao" class="form-label">Observação</label>
                <textarea class="form-control" id="observacao" rows="3"></textarea>
              </div>
              <!-- 11. Inserir Anexo (Upload) - Permite múltiplos anexos -->
              <div class="mb-3">
                <label for="arquivo" class="form-label">Inserir Anexo</label>
                <input type="file" class="form-control" id="arquivo" accept="image/*" capture="environment" multiple>
              </div>
              <button type="submit" class="btn btn-primary">Criar Lançamento</button>
            </form>
            <div id="formError" class="mt-2"></div>
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

    // Coleta dos valores do formulário
    const filial = document.getElementById('filial').value.trim();
    const fornecedor = document.getElementById('fornecedor').value.trim();
    const numeroDocumento = document.getElementById('numeroDocumento').value.trim();
    const tipoDocumento = document.getElementById('tipoDocumento').value;
    const dataEmissao = document.getElementById('dataEmissao').value;
    const valor = document.getElementById('valor').value.trim();
    const vencimento = document.getElementById('vencimento').value;
    const centroCusto = document.getElementById('centroCusto').value;
    const projeto = document.getElementById('projeto').value;
    const observacao = document.getElementById('observacao').value.trim();
    const arquivoInput = document.getElementById('arquivo');

    // Validação de campos obrigatórios com mensagens amigáveis
    let errors = [];
    if (!filial) errors.push("Filial");
    if (!fornecedor) errors.push("Fornecedor");
    if (!numeroDocumento) errors.push("N° Documento");
    if (!tipoDocumento) errors.push("Tipo de Documento");
    if (!dataEmissao) errors.push("Data de Emissão");
    if (!valor) errors.push("Valor");
    if (!vencimento) errors.push("Vencimento");
    if (!centroCusto) errors.push("Centro de Custo");
    if (!projeto) errors.push("Projeto");

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

    if (errors.length > 0) {
      formError.innerHTML = `<div class="alert alert-danger"><strong>Por favor, corrija os seguintes campos:</strong><ul>${errors.map(err => `<li>${err}</li>`).join('')}</ul></div>`;
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
      // Verifica novamente se há pelo menos um arquivo
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
      formError.innerHTML = `<div class="alert alert-danger">Erro ao fazer upload dos anexos: ${uploadError.message}</div>`;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      return;
    }

    try {
      const result = await createLancamento(AuthService, payload);
      // Validação de integridade da resposta da API
      if (!result || !result.id) {
        throw new Error("A resposta da API não contém os dados esperados.");
      }
      alert("Lançamento criado com sucesso! ID: " + result.id);
      lancamentoForm.reset();
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
      formError.innerHTML = `<div class="alert alert-danger">Erro ao criar lançamento: ${error.message}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  AuthService.onAuthChange((user) => {
    if (user) {
      document.getElementById('form-section').classList.remove('d-none');
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