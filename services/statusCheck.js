const DEBUG_MODE = false; // Altere para true se quiser habilitar os logs

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

export default class StatusCheck {
    constructor() {
        this.createAlertStyles();
    }

    // Adiciona estilos para o modal
    createAlertStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .status-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #fff;
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 20px;
                z-index: 10000;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                width: 300px;
            }
            .status-modal h2 {
                margin: 0 0 10px;
                font-size: 18px;
            }
            .status-modal p {
                margin: 0 0 20px;
                font-size: 14px;
                color: #555;
            }
            .status-modal button {
                padding: 8px 15px;
                margin: 5px;
                font-size: 14px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            .status-modal button.confirm {
                background-color: #007bff;
                color: #fff;
            }
            .status-modal button.cancel {
                background-color: #dc3545;
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    }

    // Exibe o modal de decisão
    showDecisionModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'status-modal';

            const titleEl = document.createElement('h2');
            titleEl.textContent = title;

            const messageEl = document.createElement('p');
            messageEl.textContent = message;

            const buttonConfirm = document.createElement('button');
            buttonConfirm.textContent = 'Continuar';
            buttonConfirm.className = 'confirm';
            buttonConfirm.onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            const buttonCancel = document.createElement('button');
            buttonCancel.textContent = 'Sair';
            buttonCancel.className = 'cancel';
            buttonCancel.onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };

            modal.appendChild(titleEl);
            modal.appendChild(messageEl);
            modal.appendChild(buttonConfirm);
            modal.appendChild(buttonCancel);

            document.body.appendChild(modal);
        });
    }

    // Verifica o status da OpenAI
    async checkStatus() {
        try {
            const response = await fetch('https://status.openai.com/api/v2/status.json');
            const data = await response.json();
            const status = data.status.description;

            debugLog(`Status recebido da OpenAI: ${status}`);
            console.log(`Status recebido da API: ${status}`);

            // Mapeia os status para mensagens amigáveis
            const friendlyMessages = {
                'All Systems Operational': 'Todos os sistemas da OpenAI estão funcionando normalmente.',
                'Degraded Performance': 'Os serviços da OpenAI estão enfrentando lentidão. Algumas operações podem levar mais tempo para serem concluídas.',
                'Partial System Outage': 'Algumas funcionalidades da OpenAI estão indisponíveis no momento. Você pode continuar com limitações.',
                'Major System Outage': 'A OpenAI está enfrentando problemas significativos. As operações podem ser interrompidas.',
                'Partially Degraded Service': 'Os serviços da OpenAI estão funcionando parcialmente. Algumas funcionalidades podem estar lentas ou indisponíveis.',
                'Minor Service Outage': 'Pequenos problemas foram detectados nos serviços da OpenAI. Algumas funcionalidades podem estar temporariamente indisponíveis.'
            };

            const friendlyMessage = friendlyMessages[status] || 
                `Os serviços da OpenAI podem estar enfrentando problemas. Status reportado: "${status}". Deseja continuar?`;

            if (status !== 'All Systems Operational') {
                return await this.showDecisionModal(
                    'Atenção: Problema Detectado',
                    friendlyMessage
                );
            }

            debugLog('Status operacional. Nenhum alerta exibido.');
            return true;
        } catch (error) {
            console.error('Erro ao verificar o status da OpenAI:', error);
            return await this.showDecisionModal(
                'Erro na Conexão',
                'Não foi possível verificar o status da OpenAI devido a um problema de rede. Por favor, verifique sua conexão ou tente novamente mais tarde.'
            );
        }
    }
}