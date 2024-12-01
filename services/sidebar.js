export default class Sidebar {
    constructor() {
      this.init();
    }
  
    init() {
      // Cria a estrutura HTML para a sidebar e o botão
      this.createSidebar();
      this.createToggleButton();
  
      // Adiciona eventos ao botão
      this.toggleButton = document.getElementById('toggleSidebar');
      this.sidebar = document.getElementById('sidebar');
      this.toggleText = document.getElementById('toggleText');
  
      this.toggleButton.addEventListener('click', () => this.toggleSidebar());
    }
  
    createSidebar() {
      const sidebar = document.createElement('div');
      sidebar.id = 'sidebar';
      sidebar.className = 'sidebar';
      sidebar.innerHTML = `
        <a href="#">Página 1</a>
        <a href="#">Página 2</a>
        <a href="#">Página 3</a>
        <a href="#">Página 4</a>
      `;
      document.body.appendChild(sidebar);
    }
  
    createToggleButton() {
      const wrapper = document.createElement('div');
      wrapper.className = 'toggle-btn-wrapper';
  
      const button = document.createElement('button');
      button.id = 'toggleSidebar';
      button.className = 'toggle-btn';
      button.innerHTML = '<span id="toggleText">Abrir</span>';
  
      wrapper.appendChild(button);
      document.body.appendChild(wrapper);
    }
  
    toggleSidebar() {
      this.sidebar.classList.toggle('active');
      if (this.sidebar.classList.contains('active')) {
        this.toggleText.textContent = 'Fechar';
      } else {
        this.toggleText.textContent = 'Abrir';
      }
    }
  }