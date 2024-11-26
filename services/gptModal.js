// gptModal.js

// Inicializar partículas apenas quando o modal é mostrado
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('gpt-modal');
    const particlesContainerId = 'modal-particles-js';

    // Configuração de Particles.js
    const initParticles = () => {
        particlesJS(particlesContainerId, {
            particles: {
                number: {
                    value: 150,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: { value: "#ffffff" },
                shape: {
                    type: "circle",
                    stroke: { width: 0, color: "#000000" }
                },
                opacity: {
                    value: 0.5,
                    random: false
                },
                size: {
                    value: 3,
                    random: true
                },
                line_linked: {
                    enable: true,
                    distance: 200,
                    color: "#ffffff",
                    opacity: 0.2,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 0.5,
                    direction: "none",
                    random: false,
                    out_mode: "out",
                    bounce: false
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: { enable: true, mode: "repulse" },
                    onclick: { enable: true, mode: "push" },
                    resize: true
                },
                modes: {
                    repulse: { distance: 100, duration: 0.4 },
                    push: { particles_nb: 4 }
                }
            },
            retina_detect: true
        });
    };

    // Detectar quando o modal é aberto
    modal.addEventListener('show.bs.modal', () => {
        const particlesContainer = document.getElementById(particlesContainerId);
        if (!particlesContainer.hasChildNodes()) {
            initParticles();
        }
    });
});