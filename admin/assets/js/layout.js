// Layout Google Admin Console: sidebar + topbar
(function() {
  // Topbar
  const topbar = `
    <div class="admin-topbar">
      <button class="sidebar-toggle" aria-label="Abrir/Fechar menu"><i class="bi bi-list"></i></button>
      <div class="admin-topbar-logo">
        <img src="/favicon.ico" alt="Logo LexiDecis" />
        LexiDecis
      </div>
      <span class="admin-topbar-title">Painel Administrativo</span>
    </div>
  `;
  // Sidebar
  const sidebar = `
    <nav class="admin-sidebar">
      <ul class="admin-sidebar-nav">
        <li><a class="admin-sidebar-link" href="index.html"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
        <li><a class="admin-sidebar-link" href="users.html"><i class="bi bi-people"></i> Usuários</a></li>
        <li><a class="admin-sidebar-link" href="units.html"><i class="bi bi-building"></i> Unidades</a></li>
        <li><a class="admin-sidebar-link" href="gpts.html"><i class="bi bi-cpu"></i> GPTs</a></li>
      </ul>
      <div class="admin-sidebar-footer">&copy; 2024 LexiDecis</div>
    </nav>
  `;
  // Remove header/footer antigos se existirem
  const oldHeader = document.querySelector('body > header');
  if (oldHeader) oldHeader.remove();
  const oldFooter = document.querySelector('body > footer');
  if (oldFooter) oldFooter.remove();
  // Insere topbar e sidebar
  document.body.insertAdjacentHTML('afterbegin', topbar);
  document.body.insertAdjacentHTML('afterend', sidebar);
  // Marca link ativo
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.admin-sidebar-link').forEach(link => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });
  // Lógica do botão de colapso/expansão
  const sidebarEl = document.querySelector('.admin-sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle');
  function toggleSidebar() {
    if (window.innerWidth <= 900) {
      sidebarEl.classList.toggle('open');
    } else {
      sidebarEl.classList.toggle('collapsed');
    }
  }
  toggleBtn.addEventListener('click', toggleSidebar);
  // Fecha sidebar ao clicar fora em telas pequenas
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 900 && sidebarEl.classList.contains('open')) {
      if (!sidebarEl.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebarEl.classList.remove('open');
      }
    }
  });
})(); 