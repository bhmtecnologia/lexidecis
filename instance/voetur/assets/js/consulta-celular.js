import { registerRoute } from "../js/router.js";

export async function renderConsultaCelular() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="container-fluid">
      <!-- Título e Breadcrumb -->
      <div class="page-title">
        <div class="row">
          <div class="col-sm-6 col-12">
            <h2>Consulta de Celular</h2>
            <p class="mb-0 text-title-gray">Digite o celular e clique em "Consultar".</p>
          </div>
          <div class="col-sm-6 col-12">
            <ol class="breadcrumb">
              <li class="breadcrumb-item">
                <a href="index.html">
                  <i class="iconly-Home icli svg-color"></i>
                </a>
              </li>
              <li class="breadcrumb-item">Consulta</li>
              <li class="breadcrumb-item active">Celular</li>
            </ol>
          </div>
        </div>
      </div>
      
      <!-- Formulário de Consulta -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <form id="celularForm">
                <div class="row align-items-end">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="celular">Celular: <span id="celularFeedback" class="ml-2"></span></label>
                      <input type="text" id="celular" class="form-control" placeholder="(dd)9999-9999">
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
  const inputCelular = document.getElementById('celular');
  const celularFeedback = document.getElementById('celularFeedback');
  const form = document.getElementById('celularForm');
  const btnConsultar = document.getElementById('btnConsultar');
  const btnDownload = document.getElementById('btnDownload');
  const btnDownloadCSV = document.getElementById('btnDownloadCSV');
  const btnDownloadDOCX = document.getElementById('btnDownloadDOCX');
  const btnPrint = document.getElementById('btnPrint');
  const spinner = document.getElementById('spinner');
  const resultadoConteudo = document.getElementById('resultadoConteudo');

  // Função para validar o celular (padrão: (dd)9999-9999)
  function validarCelular(value) {
    const regex = /^\(\d{2}\)\d{4}-\d{4}$/;
    return regex.test(value);
  }

  // Aplica a máscara e validação em tempo real no campo Celular
  inputCelular.addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    let formatted = "";
    if (digits.length === 0) {
      formatted = "";
    } else if (digits.length <= 2) {
      formatted = `(${digits}`;
    } else if (digits.length <= 6) {
      formatted = `(${digits.substring(0,2)})` + digits.substring(2);
    } else {
      formatted = `(${digits.substring(0,2)})` + digits.substring(2,6);
      if (digits.length > 6) {
        formatted += '-' + digits.substring(6,10);
      }
    }
    e.target.value = formatted;

    // Validação em tempo real: atualiza o feedback inline
    if (formatted.length === 13) { // (dd)9999-9999 -> 13 caracteres
      if (validarCelular(formatted)) {
        inputCelular.classList.remove('is-invalid');
        inputCelular.classList.add('is-valid');
        celularFeedback.textContent = "válido";
        celularFeedback.classList.remove('text-danger');
        celularFeedback.classList.add('text-success');
      } else {
        inputCelular.classList.remove('is-valid');
        inputCelular.classList.add('is-invalid');
        celularFeedback.textContent = "inválido";
        celularFeedback.classList.remove('text-success');
        celularFeedback.classList.add('text-danger');
      }
    } else {
      inputCelular.classList.remove('is-valid', 'is-invalid');
      celularFeedback.textContent = "";
      celularFeedback.classList.remove('text-success', 'text-danger');
    }
  });

  // Evento do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const celular = inputCelular.value.trim();
    if (!celular || !validarCelular(celular)) {
      alert("Por favor, insira um celular válido.");
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
    const url = `https://n8n.bhm.tec.br/webhook/consulta-celular?numero=${encodeURIComponent(celular)}`;

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
          Erro ao consultar o celular: ${error.message}
        </div>
      `;
    } finally {
      btnConsultar.disabled = false;
      spinner.style.display = "none";
    }
  });

  // Função para exibir o resultado e habilitar os botões de exportação/impressão
  function exibirResultado(data) {
    if (!data || (Array.isArray(data) && !data.length)) {
      resultadoConteudo.innerHTML = "Nenhum resultado encontrado.";
      return;
    }
    
    // Habilita os botões se houver dados
    btnDownload.disabled = false;
    btnDownloadCSV.disabled = false;
    btnDownloadDOCX.disabled = false;
    btnPrint.disabled = false;

    // Extrai o conteúdo markdown da resposta
    let markdownText = "";
    if (Array.isArray(data)) {
      markdownText = data[0]?.text;
    } else {
      markdownText = data.text;
    }

    if (typeof markdownText === 'string' && markdownText.startsWith("```markdown")) {
      markdownText = markdownText.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
    }
    const htmlContent = marked.parse(markdownText || "");
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
    const filename = `relatorio_celular_${gerarTimestamp()}.pdf`;
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
    const filename = `relatorio_celular_${gerarTimestamp()}.csv`;
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
    const filename = `relatorio_celular_${gerarTimestamp()}.doc`;
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

registerRoute('#consulta-celular', renderConsultaCelular);