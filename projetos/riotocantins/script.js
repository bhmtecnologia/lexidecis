// Menu mobile
const menuToggle = document.getElementById('menu-toggle');
const navUl = document.querySelector('nav ul');
menuToggle.addEventListener('click', () => {
  navUl.classList.toggle('open');
});
// Fecha o menu ao clicar em um link (mobile)
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', () => {
    navUl.classList.remove('open');
  });
});
// Scroll suave
const links = document.querySelectorAll('a[href^="#"]');
for (const link of links) {
  link.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
}
// Feedback do formulário de contato
document.getElementById('form-contato').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Mensagem enviada! Obrigado pelo contato.');
  this.reset();
});
// Notícias do Agronegócio via RSS
const feeds = [
  {
    url: 'https://www.canalrural.com.br/feed/',
    name: 'Canal Rural'
  },
  {
    url: 'https://www.agrolink.com.br/rss/noticias.rss',
    name: 'Agrolink'
  },
  {
    url: 'https://www.noticiasagricolas.com.br/podcasts.rss',
    name: 'Notícias Agrícolas'
  },
  {
    url: 'https://www.gazetadopovo.com.br/feed/rss/agronegocio.xml',
    name: 'Gazeta do Povo'
  }
];

const noticiasLista = document.getElementById('noticias-lista');
const rssBtns = document.querySelectorAll('.rss-btn');

function formatarData(dataStr) {
  const data = new Date(dataStr);
  if (isNaN(data)) return '';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function carregarNoticias(feedUrl) {
  noticiasLista.innerHTML = '<p>Carregando notícias...</p>';
  try {
    // Usando API pública para contornar CORS (rss2json)
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const resp = await fetch(apiUrl);
    const data = await resp.json();
    if (!data.items || data.items.length === 0) {
      noticiasLista.innerHTML = '<p>Nenhuma notícia encontrada.</p>';
      return;
    }
    noticiasLista.innerHTML = '';
    data.items.slice(0, 5).forEach(item => {
      const noticia = document.createElement('div');
      noticia.className = 'noticia-item';
      noticia.innerHTML = `
        <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
        <span class="noticia-data">${formatarData(item.pubDate)}</span>
        <div>${item.description ? item.description.replace(/<[^>]+>/g, '').slice(0, 120) + '...' : ''}</div>
      `;
      noticiasLista.appendChild(noticia);
    });
  } catch (e) {
    noticiasLista.innerHTML = '<p>Erro ao carregar notícias.</p>';
  }
}

async function carregarTodasNoticias() {
  noticiasLista.innerHTML = '<p>Carregando notícias...</p>';
  try {
    const promises = feeds.map(feed => fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`).then(r => r.json()));
    const results = await Promise.all(promises);
    let todasNoticias = [];
    results.forEach(data => {
      if (data.items) todasNoticias = todasNoticias.concat(data.items.map(item => ({...item, fonte: data.feed && data.feed.title ? data.feed.title : ''})));
    });
    if (todasNoticias.length === 0) {
      noticiasLista.innerHTML = '<p>Nenhuma notícia encontrada.</p>';
      return;
    }
    todasNoticias.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    noticiasLista.innerHTML = '';
    todasNoticias.slice(0, 8).forEach(item => {
      const noticia = document.createElement('div');
      noticia.className = 'noticia-item';
      noticia.innerHTML = `
        <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
        <span class="noticia-data">${formatarData(item.pubDate)}${item.fonte ? ' • ' + item.fonte : ''}</span>
        <div>${item.description ? item.description.replace(/<[^>]+>/g, '').slice(0, 120) + '...' : ''}</div>
      `;
      noticiasLista.appendChild(noticia);
    });
  } catch (e) {
    noticiasLista.innerHTML = '<p>Erro ao carregar notícias.</p>';
  }
}

rssBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    rssBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    if (this.dataset.feed === 'todas') {
      carregarTodasNoticias();
    } else {
      carregarNoticias(this.dataset.feed);
    }
  });
});
// Carrega o botão 'Todas' por padrão
document.querySelector('.rss-btn[data-feed="todas"]').classList.add('active');
carregarTodasNoticias();

// Carrossel de vídeos na Home
const carouselMedias = document.querySelectorAll('.carousel-media');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');
let carouselIndex = 0;
let carouselInterval;

const indicators = document.querySelectorAll('.carousel-indicator');
function updateIndicators(idx) {
  indicators.forEach((el, i) => el.classList.toggle('active', i === idx));
}
function showCarouselMedia(idx) {
  carouselMedias.forEach((media, i) => {
    media.classList.toggle('active', i === idx);
    if (i === idx) {
      media.currentTime = 0;
      media.play && media.play();
    } else {
      media.pause && media.pause();
    }
  });
  updateIndicators(idx);
}
function nextCarouselMedia() {
  carouselIndex = (carouselIndex + 1) % carouselMedias.length;
  showCarouselMedia(carouselIndex);
}
function prevCarouselMedia() {
  carouselIndex = (carouselIndex - 1 + carouselMedias.length) % carouselMedias.length;
  showCarouselMedia(carouselIndex);
}
if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => {
    prevCarouselMedia();
    resetCarouselInterval();
  });
  nextBtn.addEventListener('click', () => {
    nextCarouselMedia();
    resetCarouselInterval();
  });
}
function resetCarouselInterval() {
  clearInterval(carouselInterval);
  carouselInterval = setInterval(nextCarouselMedia, 7000);
}
if (carouselMedias.length > 1) {
  carouselInterval = setInterval(nextCarouselMedia, 7000);
}
indicators.forEach((el, i) => {
  el.addEventListener('click', () => {
    carouselIndex = i;
    showCarouselMedia(carouselIndex);
    resetCarouselInterval();
  });
});
// Inicializa o carrossel
showCarouselMedia(carouselIndex);

// Vídeo de background dinâmico na Home
const heroBgVideos = document.querySelectorAll('.hero-bg-video');
let heroBgIndex = 0;
function showHeroBg(idx) {
  heroBgVideos.forEach((vid, i) => {
    vid.classList.toggle('active', i === idx);
    if (i === idx) {
      vid.currentTime = 0;
      vid.play && vid.play();
    } else {
      vid.pause && vid.pause();
    }
  });
}
function nextHeroBg() {
  heroBgIndex = (heroBgIndex + 1) % heroBgVideos.length;
  showHeroBg(heroBgIndex);
}
if (heroBgVideos.length > 1) {
  setInterval(nextHeroBg, 8000);
}
showHeroBg(heroBgIndex); 