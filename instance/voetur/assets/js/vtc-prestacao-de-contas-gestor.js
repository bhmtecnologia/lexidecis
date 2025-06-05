import AuthService from "./auth.js";
import { registerRoute } from "./router.js";

export async function renderChat() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div style="
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
      color: #333;
      font-family: Arial, sans-serif;
    ">
      <p style="font-size: 18px; line-height: 1.5;">
        Para visualizar o relatório de Prestação de Contas, clique no botão abaixo:
      </p>
      <button id="openPrestacao" style="
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
      ">
        Abrir em nova aba
      </button>
    </div>
  `;
  document.getElementById('openPrestacao')
    .addEventListener('click', () => {
      window.open(
        'https://voetur.bennercloud.com.br/CORPORATIVO/Pages/PrestacaodeContasControladoria.aspx?i=K_CONTASCONTROLADORIA&m=MAIN',
        '_blank'
      );
    });
}

registerRoute('#vtc-prestacao-de-contas-gestor', renderChat);