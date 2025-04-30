import { registerRoute } from "../js/router.js";

export async function renderDecisorLiberacaoAp() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <style>
      /* Preserve all styles from the provided HTML */
      body { font-family: Arial, sans-serif; margin: 2rem; }
      label { font-weight: bold; margin-right: 0.5rem; }
      #debugOutput { white-space: pre-wrap; background: #f0f0f0; padding: 1rem; border-radius: 4px; margin-top: 1rem; max-height: 300px; overflow-y: auto; }
      input, button { padding: 0.5rem; font-size: 1rem; margin-right: 0.5rem; }
      table.parcelas-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      table.parcelas-table th, table.parcelas-table td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
      .parcelas-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 1rem; padding: 1rem; position: relative; border-left: 6px solid #8bdb74; }
      .parcelas-card .card-header { font-size: 0.85rem; color: #666; margin-top: 0.5rem; }
      .parcelas-card .card-header div { font-size: 1rem; color: #333; font-weight: bold; }
      .parcelas-card .card-row { display: flex; margin-top: 0.5rem; }
      .parcelas-card .card-item { flex: 1; padding: 0.5rem; border-top: 1px solid #eee; border-right: 1px solid #eee; }
      .parcelas-card .card-item:last-child { border-right: none; }
      .parcelas-card .card-item-full { flex: 1; padding: 0.5rem; border-top: 1px solid #eee; }
      .parcelas-card .card-row .card-icon { width: 40px; display: flex; justify-content: center; align-items: center; border-top: 1px solid #eee; cursor: pointer; }
      #anexosModal, #detalhesModal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; }
      .modal-content { background: #fff; padding: 1rem; border-radius: 8px; max-width: 600px; width: 90%; }
      .anexo-card { display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0; }
      .anexo-card .anexo-name { flex: 1; margin-left: 0.5rem; }
      .icon-btn { font-size: 1.5rem; cursor: pointer; margin-left: 0.5rem; }
      .icon-btn.loading { width: 1em; height: 1em; border: 2px solid #ccc; border-top-color: #333; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-left: 0.5rem; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <div style="margin-top: 2rem;">
      <h2>Parcelas</h2>
      <div id="parcelasContainer"></div>
    </div>
    <div id="anexosModal">
      <div class="modal-content">
        <h2>Anexos</h2>
        <div id="anexosContainer"></div>
        <button id="closeModal">Fechar</button>
      </div>
    </div>
    <div id="detalhesModal">
      <div class="modal-content" style="max-width:500px; position:relative;">
        <button id="closeDetalhes" style="position:absolute; top:8px; right:8px; font-size:1.5rem; background:none; border:none; cursor:pointer;">&times;</button>
        <h2>Aprovação liberação de AP <span id="detalhesNumero"></span> &gt; Detalhes</h2>
        <div style="margin-top:1rem;">
          <div><small>Filial</small><div id="detalhesFilial"></div></div>
          <div><small>Documento</small><div id="detalhesDocumento"></div></div>
          <div><small>Fornecedor</small><div id="detalhesFornecedor"></div></div>
          <div><small>CPF/CNPJ</small><div id="detalhesCpfCnpj"></div></div>
          <div style="display:flex; gap:1rem;">
            <div><small>Data de emissão</small><div id="detalhesDataEmissao"></div></div>
            <div><small>Data entrada</small><div id="detalhesDataEntrada"></div></div>
          </div>
          <div><small>Operação</small><div id="detalhesOperacao"></div></div>
          <div><small>Histórico</small><div id="detalhesHistorico"></div></div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:1.5rem;">
          <button id="btnReprovar" style="padding:0.75rem 1.5rem; background:#c30000; color:#fff; border:none; border-radius:4px; cursor:pointer;">Reprovar</button>
          <button id="btnAprovar" style="padding:0.75rem 1.5rem; background:#004f8c; color:#fff; border:none; border-radius:4px; cursor:pointer;">Aprovar</button>
        </div>
      </div>
    </div>
  `;

  async function listParcelas() {
    const container = document.getElementById('parcelasContainer');
    try {
      const resp = await fetch('https://webhook.power.tec.br/webhook/voetur/v1/Decisor/LiberacaoAp/ListarParcelas');
      if (!resp.ok) throw new Error('Erro HTTP: ' + resp.status);
      const resJson = await resp.json();
      const root = Array.isArray(resJson) ? resJson[0] : resJson;
      const parcelas = Array.isArray(root.Data) ? root.Data : [];
      if (!parcelas.length) {
        container.textContent = 'Nenhuma parcela encontrada.';
        return;
      }
      container.innerHTML = parcelas.map((p, idx) => `
        <div class="parcelas-card">
          <div class="card-header"><span>Filial</span><div>${p.DescricaoFilial}</div></div>
          <div class="card-header"><span>Grupo Assinaturas</span><div>${p.GrupoDeAssinaturas}</div></div>
          <div class="card-row">
            <div class="card-item"><span>Documento</span><div>${p.Documento}</div></div>
            <div class="card-item"><span>AP</span><div>${p.AP}</div></div>
            <div class="card-item"><span>Parcela</span><div>${p.NroParcela}</div></div>
          </div>
          <div class="card-row">
            <div class="card-item-full"><span>Fornecedor</span><div>${p.Fornecedor || ''}</div></div>
          </div>
          <div class="card-row">
            <div class="card-item"><span>Vlr Nominal</span><div>${p.ValorNominal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
            <div class="card-item"><span>Vlr Líquido</span><div>${p.ValorLiquido.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div></div>
            <div class="card-item"><span>Vencimento</span><div>${new Date(p.DataVencimento).toLocaleDateString('pt-BR')}</div></div>
          </div>
          <div class="card-row">
            <div class="card-item-full"><span>Histórico</span><div>${p.HistoricoParcela}</div></div>
            <div class="card-icon" data-idx="${idx}">📎</div>
          </div>
        </div>
      `).join('');
      // Evento de ícones e modais (copiar lógica do HTML)
      // ...
    } catch (err) {
      container.textContent = 'Erro ao listar parcelas: ' + err.message;
    }
  }

  await listParcelas();
}

registerRoute('#decisor-liberacaoap', renderDecisorLiberacaoAp);