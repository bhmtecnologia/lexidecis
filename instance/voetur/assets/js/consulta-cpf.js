import { registerRoute } from "../js/router.js";

export async function renderConsultaCpf() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Consulta de CPF</h2>
            <p class="mb-0 text-title-gray">Digite o CPF e clique em "Consultar".</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Consulta</li>
              <li class="breadcrumb-item active">CPF</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Formulário de Consulta -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <form id="cpfForm">
                <div class="row align-items-end">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="cpf">CPF: <span id="cpfFeedback" class="ml-2"></span></label>
                      <input type="text" id="cpf" class="form-control" placeholder="000.000.000-00">
                    </div>
                  </div>
                  <div class="col-md-2">
                    <button id="btnConsultar" type="submit" class="btn btn-primary">Consultar</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Área para exibir os resultados -->
      <div class="row">
        <div class="col-12">
          <div id="resultado" class="card">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0">Resultado da Consulta</h4>
              <div>
                <button id="btnDownload" class="btn btn-light btn-sm" style="color: black;" disabled>Download PDF</button>
                <button id="btnDownloadCSV" class="btn btn-light btn-sm" style="color: black;" disabled>Download CSV</button>
                <button id="btnDownloadDOCX" class="btn btn-light btn-sm" style="color: black;" disabled>Download DOCX</button>
                <button id="btnPrint" class="btn btn-light btn-sm" style="color: black;" disabled>Imprimir</button>
              </div>
            </div>
            <div class="card-body">
              <div id="spinner" class="text-center" style="display: none; margin-bottom: 10px;">
                <div class="spinner-border text-primary" role="status">
                  <span class="sr-only">Loading...</span>
                </div>
              </div>
              <div id="resultadoConteudo" class="report-content"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Referências aos elementos
  const inputCpf = document.getElementById('cpf');
  const cpfFeedback = document.getElementById('cpfFeedback');
  const form = document.getElementById('cpfForm');
  const btnConsultar = document.getElementById('btnConsultar');
  const btnDownload = document.getElementById('btnDownload');
  const btnDownloadCSV = document.getElementById('btnDownloadCSV');
  const btnDownloadDOCX = document.getElementById('btnDownloadDOCX');
  const btnPrint = document.getElementById('btnPrint');
  const spinner = document.getElementById('spinner');
  const resultadoConteudo = document.getElementById('resultadoConteudo');

  // Função para validar o CPF (verifica o padrão 000.000.000-00)
  function validarCpf(value) {
    const regex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    return regex.test(value);
  }

  // Aplica a máscara e validação em tempo real no campo CPF
  inputCpf.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    // Aplica o padrão: 000.000.000-00
    if (value.length > 3) value = value.replace(/^(\d{3})(\d)/, "$1.$2");
    if (value.length > 7) value = value.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    if (value.length > 11) value = value.replace(/\.(\d{3})(\d)/, ".$1-$2");
    e.target.value = value;

    // Validação em tempo real: atualiza o feedback inline
    if (value.length === 14) {
      if (validarCpf(value)) {
        inputCpf.classList.remove('is-invalid');
        inputCpf.classList.add('is-valid');
        cpfFeedback.textContent = "válido";
        cpfFeedback.classList.remove('text-danger');
        cpfFeedback.classList.add('text-success');
      } else {
        inputCpf.classList.remove('is-valid');
        inputCpf.classList.add('is-invalid');
        cpfFeedback.textContent = "inválido";
        cpfFeedback.classList.remove('text-success');
        cpfFeedback.classList.add('text-danger');
      }
    } else {
      inputCpf.classList.remove('is-valid', 'is-invalid');
      cpfFeedback.textContent = "";
      cpfFeedback.classList.remove('text-success', 'text-danger');
    }
  });

  // Evento do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpf = inputCpf.value.trim();
    if (!cpf || !validarCpf(cpf)) {
      alert("Por favor, insira um CPF válido.");
      return;
    }
    
    // Desabilita botões e exibe spinner
    btnConsultar.disabled = true;
    btnDownload.disabled = true;
    btnDownloadCSV.disabled = true;
    btnDownloadDOCX.disabled = true;
    btnPrint.disabled = true;
    resultadoConteudo.innerHTML = "";
    spinner.style.display = "block";

    // Constrói a URL com o parâmetro de consulta
    const url = `https://n8n.bhm.tec.br/webhook/consulta-cpf?cpf=${encodeURIComponent(cpf)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Erro na consulta, status: ${response.status}`);
      }
      
      const data = await response.json();
      exibirResultado(data);
    } catch (error) {
      console.error("Erro:", error);
      resultadoConteudo.innerHTML = `
        <div class="alert alert-danger">
          Erro ao consultar o CPF: ${error.message}
        </div>
      `;
    } finally {
      btnConsultar.disabled = false;
      spinner.style.display = "none";
    }
  });

  // Função para exibir o resultado e habilitar os botões de exportação/impressão
  function exibirResultado(data) {
    if (!data || !data.length) {
      resultadoConteudo.innerHTML = "Nenhum resultado encontrado.";
      return;
    }
    
    // Habilita os botões se houver dados
    btnDownload.disabled = false;
    btnDownloadCSV.disabled = false;
    btnDownloadDOCX.disabled = false;
    btnPrint.disabled = false;

    // Obtém o markdown retornado pela API
    let markdownText = data[0].text;
    if (markdownText.startsWith("```markdown")) {
      markdownText = markdownText.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    }
    const htmlContent = marked.parse(markdownText);
    resultadoConteudo.innerHTML = htmlContent;
  }

  // Função para criar um timestamp no formato YYYY-MM-DD_HH-mm-ss
  function gerarTimestamp() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  }

  // Função para download em PDF usando html2pdf
  function downloadPdf() {
    const element = resultadoConteudo;
    const filename = `relatorio_cpf_${gerarTimestamp()}.pdf`;
    const opt = {
      margin:       1,
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  // Função para download em CSV
  function downloadCsv() {
    const text = resultadoConteudo.innerText;
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const filename = `relatorio_cpf_${gerarTimestamp()}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Função para download em DOCX (arquivo Word simples)
  function downloadDocx() {
    const contentHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset="utf-8"></head><body>${resultadoConteudo.innerHTML}</body></html>`;
    const blob = new Blob(['\ufeff', contentHTML], { type: 'application/msword' });
    const filename = `relatorio_cpf_${gerarTimestamp()}.doc`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Função para imprimir o relatório
  function imprimirRelatorio() {
    window.print();
  }

  // Eventos dos botões de exportação e impressão
  btnDownload.addEventListener('click', downloadPdf);
  btnDownloadCSV.addEventListener('click', downloadCsv);
  btnDownloadDOCX.addEventListener('click', downloadDocx);
  btnPrint.addEventListener('click', imprimirRelatorio);
}

registerRoute('#consulta-cpf', renderConsultaCpf);