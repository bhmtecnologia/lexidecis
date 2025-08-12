/**
 * Gerenciador de Sidebar Unificado
 * Gerencia o comportamento do sidebar em todas as páginas do admin
 */

export class SidebarManager {
  constructor() {
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    if (!this.sidebarToggle || !this.sidebar || !this.sidebarBackdrop) {
      console.warn('Elementos da sidebar não encontrados');
      return;
    }

    // Configurar evento de clique do botão toggle
    this.sidebarToggle.addEventListener('click', () => {
      this.handleToggleClick();
    });

    // Fechar sidebar ao clicar no backdrop (mobile)
    this.sidebarBackdrop.addEventListener('click', () => {
      this.closeSidebar();
    });

    // Fechar sidebar quando redimensionar para desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        this.closeSidebar();
      }
    });

    // Restaurar estado salvo do collapse (desktop)
    this.restoreCollapsedState();
    
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      console.log('✅ Sidebar unificado inicializado');
    }
    this.isInitialized = true;
  }

  /**
   * Manipula o clique no botão toggle
   * Comportamento varia conforme o tamanho da tela
   */
  handleToggleClick() {
    if (window.innerWidth <= 900) {
      // Comportamento mobile: abrir/fechar sidebar
      const isOpen = this.sidebar.classList.contains('open');
      if (isOpen) {
        this.closeSidebar();
      } else {
        this.openSidebar();
      }
    } else {
      // Comportamento desktop: colapsar/expandir sidebar
      this.toggleCollapse();
    }
  }

  /**
   * Abre o sidebar (mobile)
   */
  openSidebar() {
    this.sidebar.classList.add('open');
    if (window.innerWidth <= 900) {
      this.sidebarBackdrop.classList.add('show');
    }
  }

  /**
   * Fecha o sidebar (mobile)
   */
  closeSidebar() {
    this.sidebar.classList.remove('open');
    this.sidebarBackdrop.classList.remove('show');
  }

  /**
   * Alterna o estado collapsed do sidebar (desktop)
   */
  toggleCollapse() {
    this.sidebar.classList.toggle('collapsed');
    const isCollapsed = this.sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
    
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      console.log('🎯 Sidebar', isCollapsed ? 'colapsada' : 'expandida');
    }
  }

  /**
   * Restaura o estado salvo do collapse
   */
  restoreCollapsedState() {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed === 'true') {
      this.sidebar.classList.add('collapsed');
      if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        console.log('🔄 Estado collapsed restaurado do localStorage');
      }
    }
  }

  /**
   * Força o sidebar a fechar (útil para eventos externos)
   */
  forceClose() {
    this.closeSidebar();
  }

  /**
   * Verifica se o sidebar está aberto (mobile)
   */
  isOpen() {
    return this.sidebar.classList.contains('open');
  }

  /**
   * Verifica se o sidebar está colapsado (desktop)
   */
  isCollapsed() {
    return this.sidebar.classList.contains('collapsed');
  }

  /**
   * Retorna o estado atual do sidebar
   */
  getState() {
    return {
      isOpen: this.isOpen(),
      isCollapsed: this.isCollapsed(),
      isMobile: window.innerWidth <= 900,
      isInitialized: this.isInitialized
    };
  }
}

// Função helper para inicializar o sidebar
export function initSidebar() {
  return new SidebarManager();
} 