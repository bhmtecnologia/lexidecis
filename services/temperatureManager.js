class TemperatureManager {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      min: options.min || 0.0,
      max: options.max || 1.0,
      step: options.step || 0.1,
      value: options.value || 0.5,
      onChange: options.onChange || function (value) {
        console.log(`Temperatura alterada para: ${value}`);
      },
    };

    this.loadCSS(); // Carrega dinamicamente o CSS
    this.init();
  }

  loadCSS() {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '../styles/temperatureManager.css'; // Ajuste o caminho conforme necessário
    cssLink.type = 'text/css';
    document.head.appendChild(cssLink);
  }

  init() {
    const container = document.getElementById(this.containerId);

    if (!container) {
      console.error(`Erro: Contêiner com ID "${this.containerId}" não encontrado.`);
      return;
    }

    container.classList.add('temperature-manager');

    container.innerHTML = `
      <div class="temperature-container">
        <i class="bi bi-lightbulb icon"></i>
        <input 
          type="range" 
          min="${this.options.min}" 
          max="${this.options.max}" 
          step="${this.options.step}" 
          value="${this.options.value}" 
          id="temperature-slider"
        />
        <i class="bi bi-lightbulb-off icon"></i>
      </div>
    `;

    const slider = container.querySelector('#temperature-slider');
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value).toFixed(1);
      this.options.onChange(value);
    });
  }
}

// Inicializa o componente quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new TemperatureManager('temperature-component', {
    min: 0.0,
    max: 1.0,
    step: 0.1,
    value: 0.5,
    onChange: (value) => {
      console.log(`Nova temperatura configurada: ${value}`);
    },
  });
});