/**
 * @file financeiro-lancamentos.js
 * @description Responsável por renderizar a página de "Financeiro - Lançamentos" no módulo financeiro,
 * permitindo a criação de novos lançamentos via formulário e enviando os dados para a API.
 * Os campos Categoria, Departamento, Centro de Custo e Projeto são apresentados como combo boxes
 * com valores fictícios (que futuramente virão de uma API).
 */

import { registerRoute } from "./router.js";
import AuthService, { auth, db, analytics } from "./auth.js";
import { createLancamento } from "./api.js"; // Função para criar um lançamento na API

/**
 * Renderiza a tela de "Financeiro - Lançamentos".
 * Define a estrutura HTML da página, configura o formulário de criação e monitora a autenticação.
 */
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
              <div class="mb-3">
                <label for="descricao" class="form-label">Descrição</label>
                <input type="text" class="form-control" id="descricao" required>
              </div>
              <div class="mb-3">
                <label for="valor" class="form-label">Valor</label>
                <input type="number" step="0.01" class="form-control" id="valor" required>
              </div>
              <div class="mb-3">
                <label for="dataLancamento" class="form-label">Data do Lançamento</label>
                <input type="datetime-local" class="form-control" id="dataLancamento" required>
              </div>
              <div class="mb-3">
                <label for="categoria" class="form-label">Categoria</label>
                <select class="form-select" id="categoria" required>
                  <option value="">Selecione</option>
                  <option value="Material">Material</option>
                  <option value="Serviço">Serviço</option>
                  <option value="Despesa Geral">Despesa Geral</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="departamento" class="form-label">Departamento</label>
                <select class="form-select" id="departamento">
                  <option value="">Selecione</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="RH">RH</option>
                  <option value="TI">TI</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="centroCusto" class="form-label">Centro de Custo</label>
                <select class="form-select" id="centroCusto">
                  <option value="">Selecione</option>
                  <option value="CC-001">CC-001</option>
                  <option value="CC-002">CC-002</option>
                </select>
              </div>
              <div class="mb-3">
                <label for="projeto" class="form-label">Projeto</label>
                <select class="form-select" id="projeto">
                  <option value="">Selecione</option>
                  <option value="Projeto A">Projeto A</option>
                  <option value="Projeto B">Projeto B</option>
                  <option value="Projeto C">Projeto C</option>
                </select>
              </div>
              <!-- Upload de Anexo -->
              <div class="mb-3">
                <label for="arquivo" class="form-label">Anexo (Imagem)</label>
                <input type="file" class="form-control" id="arquivo" accept="image/*" capture="environment">
              </div>
              <button type="submit" class="btn btn-primary">Criar Lançamento</button>
            </form>
            <div id="formError" class="text-danger mt-2"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  /**
   * Função para converter data para o formato ISO.
   * @param {string} dateStr - Valor do input datetime-local.
   * @returns {string} Data no formato ISO.
   */
  function formatInputDate(dateStr) {
    return new Date(dateStr).toISOString();
  }

  // Evento de submissão do formulário
  const lancamentoForm = document.getElementById('lancamentoForm');
  lancamentoForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formError = document.getElementById('formError');
    formError.textContent = '';

    // Coleta dos valores do formulário
    const descricao = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);
    const dataLancamentoInput = document.getElementById('dataLancamento').value;
    const categoria = document.getElementById('categoria').value;
    const departamento = document.getElementById('departamento').value;
    const centroCusto = document.getElementById('centroCusto').value;
    const projeto = document.getElementById('projeto').value;
    const arquivoInput = document.getElementById('arquivo');

    // Validações básicas
    if (!descricao || isNaN(valor) || !dataLancamentoInput || !categoria) {
      formError.textContent = "Preencha os campos obrigatórios.";
      return;
    }

    // Preparação do objeto payload para a API
    let payload = {
      dados: {
        uid: AuthService.user.uid, // assume que o uid vem do objeto do usuário autenticado
        app_id: "empresaXYZ",       // definir o app_id conforme o contexto
        descricao: descricao,
        valor: valor,
        data_lancamento: formatInputDate(dataLancamentoInput),
        categoria: categoria,
        status: "pendente",
        classificacoes: {
          departamento: departamento,
          centro_custo: centroCusto,
          projeto: projeto
        }
      },
      anexos: [] // Será preenchido se houver upload
    };

    // Se houver arquivo, processa o upload
    if (arquivoInput.files.length > 0) {
      try {
        const file = arquivoInput.files[0];
        // Aqui você deve chamar sua função real de upload, por exemplo:
        // const uploadResponse = await uploadArquivo(AuthService, file);
        // payload.anexos.push({
        //   url: uploadResponse.url,
        //   categoria: "comprovante"
        // });
        // Para este exemplo, vamos assumir uma URL fixa:
        payload.anexos.push({
          url: "https://minio.seu-dominio.com/bucket/comprovante-exemplo.jpg",
          categoria: "comprovante"
        });
      } catch (uploadError) {
        formError.textContent = "Erro ao fazer upload do arquivo: " + uploadError.message;
        return;
      }
    }

    // Envia o payload para criar o lançamento via API
    try {
      const result = await createLancamento(AuthService, payload);
      alert("Lançamento criado com sucesso! ID: " + result.id);
      lancamentoForm.reset();
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
      formError.textContent = "Erro ao criar lançamento: " + error.message;
    }
  });

  // Monitora a autenticação para exibir o formulário somente se o usuário estiver logado
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

// Registra a rota para a página de "Financeiro - Lançamentos"
registerRoute('#financeiro-lancamentos', renderFinanceiroLancamentos);