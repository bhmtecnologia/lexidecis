// assets/js/menu-builder.js

export const menuItems = [
    {
      label: "Página Inicial",
      icon: "Home-dashboard",
      route: "#dashboard",
      // Subitens para o Dashboard:
      children: [
        { label: "Notícias", route: "#financeiro-lancamentos" },
        { label: "Comunicados", route: "#financeiro-lancamentos-list" },
      ]
    },
    {
        label: "Área do Gestor",
        icon: "icon-face-smile",
        route: "#dashboard",
        // Subitens para o Dashboard:
        children: [
          { label: "Lançar pagamento", route: "#financeiro-lancamentos" },
          { label: "Meus lançamentos", route: "#financeiro-lancamentos-list" },
        ]
      },
    {
      label: "Controladoria",
      icon: "Document",
      route: "#controladoria",
      children: [
        { label: "Análise dos lançamentos", route: "#dashboard-analise" },
        { label: "Todos os lançamentos", route: "#lancamentos-completo" },
      ]
    },
    {
      label: "Aprovações",
      icon: "Document",
      route: "#aprovacoes-contas-a-pagar"
    }
  ];
  
  export function buildSidebarMenu(profile) {
    console.log("Iniciando construção do menu com profile:", profile);
    const container = document.getElementById("simple-bar");
    if (!container) {
      console.error("Container do menu (#simple-bar) não encontrado");
      return;
    }
    
    if (!profile?.routes || !Array.isArray(profile.routes)) {
      console.error("Propriedade 'routes' inválida no profile:", profile.routes);
      container.innerHTML = "<li><a href='#'>Nenhum item de menu disponível</a></li>";
      return;
    }
    
    container.innerHTML = ""; // Limpa menu anterior
    
    menuItems.forEach((item) => {
      // Verifica se o item principal é permitido
      if (!profile.routes.includes(item.route)) {
        console.log(`A rota ${item.route} não consta no array de permissões:`, profile.routes);
        return;
      }
      const li = document.createElement("li");
      li.className = "sidebar-list";
      
      // Cria o link do item principal
      li.innerHTML = `
        <a class="sidebar-link" href="${item.route}">
          <svg class="stroke-icon">
            <use href="../assets/svg/iconly-sprite.svg#${item.icon}"></use>
          </svg>
          <h6>${item.label}</h6>
          <i class="iconly-Arrow-Right-2 icli toggle-icon"></i>
        </a>
      `;
      
      // Se o item possuir subitens, criamos o submenu
      if (item.children && Array.isArray(item.children) && item.children.length > 0) {
        const submenu = document.createElement("ul");
        submenu.className = "sidebar-submenu";
        // Inicialmente o submenu pode ficar oculto
        submenu.style.display = "none";
        
        item.children.forEach((child) => {
          // Verifica se cada subitem também está permitido
          if (!profile.routes.includes(child.route)) {
            console.log(`A rota ${child.route} (subitem de ${item.route}) não consta no array de permissões:`, profile.routes);
            return;
          }
          const childLi = document.createElement("li");
          childLi.innerHTML = `<a href="${child.route}">${child.label}</a>`;
          submenu.appendChild(childLi);
        });
        
        // Acrescenta o submenu ao item
        li.appendChild(submenu);
        
        // Adiciona evento para alternar o submenu ao clicar
        const link = li.querySelector("a.sidebar-link");
        link.addEventListener("click", function (e) {
          // Impede a navegação para itens que possuem submenu
          e.preventDefault();
          // Alterna exibição do submenu
          if (submenu.style.display === "none") {
            submenu.style.display = "block";
          } else {
            submenu.style.display = "none";
          }
        });
      }
      
      container.appendChild(li);
    });
    
    console.log("Menu construído. Conteúdo do container:", container.innerHTML);
  }