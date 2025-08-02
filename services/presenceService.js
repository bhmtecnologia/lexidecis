// presenceService.js
import { auth, firebaseConfig } from './auth.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import logService from './logService.js';

// Inicializa Firebase e Firestore internamente
let db = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    logService.info('PresenceService', 'Firestore inicializado internamente');
} catch (error) {
    logService.warn('PresenceService', 'Erro ao inicializar Firestore internamente:', error);
}

class PresenceService {
    constructor() {
        this.activeUsersCount = 0;
        this.presenceUnsubscribe = null;
        this.observers = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o serviço de presença
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            logService.info('PresenceService', 'Inicializando serviço de presença');
            
            // Configura listener para mudanças de presença
            this.setupPresenceListener();
            
            // Conta usuários ativos inicialmente
            await this.updateActiveUsersCount();
            
            this.isInitialized = true;
            logService.success('PresenceService', 'Serviço de presença inicializado com sucesso');
        } catch (error) {
            logService.error('PresenceService', 'Erro ao inicializar serviço de presença:', error);
        }
    }

    /**
     * Configura listener para mudanças de presença no Firestore
     */
    setupPresenceListener() {
        try {
            // Verifica se db está disponível
            if (!db) {
                logService.warn('PresenceService', 'Firestore db não disponível, usando fallback');
                this.activeUsersCount = 1;
                this.notifyObservers(this.activeUsersCount);
                return;
            }

            // Listener para todos os documentos de userSessions
            const userSessionsRef = collection(db, "userSessions");
            this.presenceUnsubscribe = onSnapshot(userSessionsRef, (snapshot) => {
                let onlineCount = 0;
                
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data && data.online === true) {
                        onlineCount++;
                    }
                });
                
                this.activeUsersCount = onlineCount;
                this.notifyObservers(onlineCount);
                
                logService.debug('PresenceService', `Usuários ativos atualizados: ${onlineCount}`);
            }, (error) => {
                logService.warn('PresenceService', 'Erro no listener de presença:', error);
                // Fallback: conta manualmente
                this.updateActiveUsersCount();
            });
            
            logService.info('PresenceService', 'Listener de presença configurado');
        } catch (error) {
            logService.error('PresenceService', 'Erro ao configurar listener de presença:', error);
            // Fallback robusto
            this.activeUsersCount = 1;
            this.notifyObservers(this.activeUsersCount);
        }
    }

    /**
     * Atualiza a contagem de usuários ativos manualmente
     */
    async updateActiveUsersCount() {
        try {
            // Verifica se db está disponível
            if (!db) {
                logService.warn('PresenceService', 'Firestore db não disponível, usando fallback');
                this.activeUsersCount = 1;
                this.notifyObservers(this.activeUsersCount);
                return this.activeUsersCount;
            }

            const userSessionsRef = collection(db, "userSessions");
            const onlineQuery = query(userSessionsRef, where("online", "==", true));
            const snapshot = await getDocs(onlineQuery);
            
            this.activeUsersCount = snapshot.size;
            this.notifyObservers(this.activeUsersCount);
            
            logService.debug('PresenceService', `Contagem manual de usuários ativos: ${this.activeUsersCount}`);
            return this.activeUsersCount;
        } catch (error) {
            logService.error('PresenceService', 'Erro ao contar usuários ativos:', error);
            // Fallback: assume pelo menos 1 usuário (o atual)
            this.activeUsersCount = 1;
            this.notifyObservers(this.activeUsersCount);
            return this.activeUsersCount;
        }
    }

    /**
     * Retorna a contagem atual de usuários ativos
     */
    getActiveUsersCount() {
        return this.activeUsersCount;
    }

    /**
     * Adiciona um observer para mudanças na contagem de usuários ativos
     */
    onActiveUsersChange(callback) {
        this.observers.push(callback);
        // Chama imediatamente com o valor atual
        callback(this.activeUsersCount);
    }

    /**
     * Remove um observer
     */
    removeObserver(callback) {
        const index = this.observers.indexOf(callback);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notifica todos os observers sobre mudanças na contagem
     */
    notifyObservers(count) {
        this.observers.forEach(callback => {
            try {
                callback(count);
            } catch (error) {
                logService.error('PresenceService', 'Erro ao notificar observer:', error);
            }
        });
    }

    /**
     * Limpa recursos do serviço
     */
    destroy() {
        if (this.presenceUnsubscribe) {
            this.presenceUnsubscribe();
            this.presenceUnsubscribe = null;
        }
        this.observers = [];
        this.isInitialized = false;
        logService.info('PresenceService', 'Serviço de presença destruído');
    }
}

// Instância singleton
const presenceService = new PresenceService();

export default presenceService; 