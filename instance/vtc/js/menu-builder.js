// /vtc/js/menu-builder.js

/**
 * Define the list of apps to show on the home screen.
 * Apps with route: null are always visible (fixed apps).
 * Apps with a non-null route appear only if profile.routes includes their route.
 */
export const menuItems = [
  // Fixed apps (no route, always visible)
  { label: "Camera",      iconClass: "fa-solid fa-camera",           color: "#FF9500", route: null },
  { label: "Mapas",       iconClass: "fa-solid fa-map-location-dot",  color: "#34C759", route: null },
  { label: "Relógio",     iconClass: "fa-solid fa-clock",            color: "#007AFF", route: null },
  { label: "Música",      iconClass: "fa-solid fa-music",            color: "#AF52DE", route: null },
  { label: "Fotos",       iconClass: "fa-solid fa-photo-film",       color: "#FFD60A", route: null },
  { label: "Ajustes",     iconClass: "fa-solid fa-cog",              color: "#8E8E93", route: "#ajustes" },

  // Dynamic apps (require permission in profile.routes)
   { label: "Mail",        iconClass: "fa-solid fa-envelope",         color: "#FF3B30", route: "#mail" },
 
  { label: "Financeiro",           iconClass: "fa-solid fa-file-invoice-dollar", color: "#5856D6", route: "#vtc-financeiro-gestor" },
  { label: "Prestação de Contas",  iconClass: "fa-solid fa-file-invoice",        color: "#5AC8FA", route: "#vtc-prestacao-de-contas-gestor" },
  { label: "KPI's",                iconClass: "fa-solid fa-chart-bar",          color: "#34C759", route: "#vtc-indicadores" },
  { label: "Aprovações",           iconClass: null, svgIcon: "Tick-Square",  color: null, route: "#aprovacoes-contas-a-pagar" },
  { label: "Controladoria",        iconClass: "fa-solid fa-chart-pie",          color: "#AF52DE", route: "#controladoria" }
];

/**
 * Builds the home screen's grid of apps inside the element #home-grid.
 * @param {object} profile - The user profile containing profile.routes array.
 */
export function buildHomeApps(profile) {
  const container = document.getElementById("home-grid");
  if (!container) {
    console.error("[buildHomeApps] Container #home-grid não encontrado");
    return;
  }
  // Clear existing content
  container.innerHTML = "";

  // Iterate over all defined apps
  menuItems.forEach(app => {
    // If app has a route, only show if profile.routes includes that route
    if (app.route && !profile.routes.includes(app.route)) {
      return;
    }

    // Create the .app-item element
    const appDiv = document.createElement("div");
    appDiv.className = "app-item";

    // Decide whether to wrap icon+label in an <a> or plain <div>
    let wrapper;
    if (app.route) {
      wrapper = document.createElement("a");
      wrapper.href = app.route;
      wrapper.className = "app-link";
      wrapper.style.textDecoration = "none";
      wrapper.style.color = "inherit";
    } else {
      wrapper = document.createElement("div");
    }

    // Create the icon container
    const iconDiv = document.createElement("div");
    iconDiv.className = "app-icon";

    // Append FontAwesome icon if iconClass is provided
    if (app.iconClass) {
      const i = document.createElement("i");
      i.className = app.iconClass;
      if (app.color) i.style.color = app.color;
      iconDiv.appendChild(i);
    }
    // Else, append an SVG sprite icon if svgIcon is provided
    else if (app.svgIcon) {
      const svg = document.createElement("svg");
      svg.className = "app-icon-svg";
      const useEl = document.createElement("use");
      useEl.setAttribute("href", `../assets/svg/iconly-sprite.svg#${app.svgIcon}`);
      svg.appendChild(useEl);
      iconDiv.appendChild(svg);
    }

    // Create the label below the icon
    const labelDiv = document.createElement("div");
    labelDiv.className = "app-label";
    labelDiv.textContent = app.label;

    // Assemble and append to container
    wrapper.appendChild(iconDiv);
    wrapper.appendChild(labelDiv);
    appDiv.appendChild(wrapper);
    container.appendChild(appDiv);
  });
}