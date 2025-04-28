(function() {
  // Single proxy endpoint base with service parameter
  const STATUS_PROXY_BASE = 'https://webhook.power.tec.br/webhook/status/v2';
  // 1) Inject CSS styles into <head>
  const css = `
    .status-indicator {
      display: inline-block;
      position: relative;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: #6c757d; /* cinza: desconhecido */
      vertical-align: middle;
      cursor: help;
      transition: background-color 0.3s ease;
    }
    .status-indicator.ok          { background-color: #28a745; }
    .status-indicator.minor       { background-color: #ffc107; }
    .status-indicator.major       { background-color: #fd7e14; }
    .status-indicator.critical    { background-color: #dc3545; }
    .status-indicator.maintenance { background-color: #17a2b8; }
    .status-tooltip {
      position: absolute;
      max-width: 200px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
      z-index: 10000;
      pointer-events: none;
      white-space: pre-wrap;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // 2) Define the indicator class
  class StatusIndicator {
    constructor(spanElement, url, serviceName, pollingInterval = 15 * 60 * 1000) {
      this.url = url;
      this.serviceName = serviceName;
      this.container = spanElement;
      this.interval = pollingInterval;
      this._keepRunning = false;
      this.friendly = {
        none:        `Todos os sistemas da ${this.serviceName} estão funcionando normalmente.`,
        maintenance: 'Serviços em manutenção programada.',
        minor:       'Degradação parcial: recursos podem estar lentos ou indisponíveis.',
        major:       'Interrupção parcial significativa.',
        critical:    'Falha crítica: serviços interrompidos.'
      };
    }

    sleep(ms) {
      return new Promise(res => setTimeout(res, ms));
    }

    async fetchStatus() {
      // Force a simple CORS request without any inherited headers or credentials
      const resp = await window.fetch(this.url, {
        mode: 'cors',
        credentials: 'omit',
        headers: {}
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp.json();
    }

    async updateOnce() {
      try {
        // Fetch and normalize the response (handle n8n webhook array)
        let data = await this.fetchStatus();
        if (Array.isArray(data)) {
          const item = data[0];
          // n8n may wrap the proxied JSON in `body` or `json`
          data = item.body || item.json || item;
        }
        const { status, page } = data;
        const { indicator, description } = status;
        const updatedAt = new Date(page.updated_at)
          .toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });

        const stateClass = indicator === 'none'
          ? 'ok'
          : (this.friendly[indicator] ? indicator : 'maintenance');

        this.container.className = `status-indicator ${stateClass}`;
        const traduzido = this.friendly[indicator] || '';
        this.container.dataset.tooltip =
          `A ${this.serviceName} informa: ${description}\n${traduzido}\nAtualizado em: ${updatedAt}`;
      } catch (err) {
        console.error(`Erro ao atualizar status ${this.serviceName}:`, err);
        this.container.className = 'status-indicator critical';
        this.container.dataset.tooltip =
          `A ${this.serviceName} informa: Não foi possível verificar o status.\nErro: ${err.message}`;
      }
    }

    async start() {
      if (this._keepRunning) return;
      this._keepRunning = true;
      while (this._keepRunning) {
        await this.updateOnce();
        await this.sleep(this.interval);
      }
    }

    stop() {
      this._keepRunning = false;
    }

    showTooltip() {
      this.hideTooltip();
      const text = this.container.dataset.tooltip;
      if (!text) return;
      const tip = document.createElement('div');
      tip.className = 'status-tooltip';
      tip.textContent = text;
      document.body.appendChild(tip);
      const rect = this.container.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      // attempt above
      let top = rect.top - tipRect.height - 6;
      if (top < 0) {
        // place below
        top = rect.bottom + 6;
      }
      let left = rect.left + (rect.width - tipRect.width) / 2;
      if (left < 0) left = 4;
      if (left + tipRect.width > window.innerWidth) {
        left = window.innerWidth - tipRect.width - 4;
      }
      tip.style.top = `${top + window.scrollY}px`;
      tip.style.left = `${left + window.scrollX}px`;
      this._tooltipEl = tip;
    }

    hideTooltip() {
      if (this._tooltipEl) {
        this._tooltipEl.remove();
        this._tooltipEl = null;
      }
    }
  }

  // 3) Auto-initialize for all elements with data-openai-status and data-gemini-status
  window.addEventListener('DOMContentLoaded', () => {
    const services = [
      { key: 'openai',     name: 'OpenAI' },
      { key: 'gemini',     name: 'Gemini' },
      { key: 'anthropic',  name: 'Anthropic' },
      { key: 'deepseek',   name: 'Deepseek' },
      { key: 'groq',       name: 'Groq' }
    ];
    services.forEach(({ key, name }) => {
      document.querySelectorAll(`[data-${key}-status]`).forEach(el => {
        const span = document.createElement('span');
        el.appendChild(span);
        const indicator = new StatusIndicator(
          span,
          `${STATUS_PROXY_BASE}?service=${key}`,
          name
        );
        span.addEventListener('mouseenter', () => indicator.showTooltip());
        span.addEventListener('mouseleave', () => indicator.hideTooltip());
        indicator.start();
      });
    });
  });
})();