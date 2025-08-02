import { auth, db, analytics } from "./firebase.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const AuthService = {
  user: null,
  observers: [],
  presenceInterval: null,

  init() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      if (user) {
        this.saveUserSession(user);
        this.startPresenceTracking(user);
      } else {
        this.stopPresenceTracking();
      }
      this.notifyObservers(user);
    });
  },

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.user = userCredential.user;
      // Salva o token no localStorage
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('authToken', token);
      this.saveUserSession(this.user);
      this.startPresenceTracking(this.user);
      this.notifyObservers(this.user);
      return { success: true, user: this.user };
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      return { success: false, error: error.message };
    }
  },

  async logout() {
    try {
      this.stopPresenceTracking();
      await signOut(auth);
      this.user = null;
      localStorage.removeItem('authToken');
      this.notifyObservers(null);
      return { success: true };
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      return { success: false, error: error.message };
    }
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: "E-mail de redefinição enviado." };
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return { success: false, error: error.message };
    }
  },

  saveUserSession(user) {
    const userDoc = doc(db, "userSessions", user.uid);
    const sessionData = {
      email: user.email,
      displayName: user.displayName || "Usuário Anônimo",
      lastLogin: serverTimestamp(),
      online: true,
      lastSeen: serverTimestamp()
    };
    
    // Salva no Firestore
    const firestorePromise = setDoc(userDoc, sessionData, { merge: true });
    
    // Salva no localStorage como backup
    this.saveLocalPresenceData(user.uid, {
      email: user.email,
      displayName: user.displayName || "Usuário Anônimo",
      online: true,
      lastSeen: new Date()
    });
    
    return firestorePromise;
  },

  startPresenceTracking(user) {
    // Para o tracking anterior se existir
    this.stopPresenceTracking();
    
    // Inicia heartbeat a cada 30 segundos
    this.presenceInterval = setInterval(async () => {
      try {
        const userDoc = doc(db, "userSessions", user.uid);
        await setDoc(userDoc, {
          lastSeen: serverTimestamp(),
          online: true
        }, { merge: true });
      } catch (error) {
        console.error("Erro ao atualizar presença:", error);
      }
    }, 30000); // 30 segundos

    // Marca como offline quando a página é fechada
    window.addEventListener('beforeunload', () => {
      this.markUserOffline(user.uid);
    });
  },

  stopPresenceTracking() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  },

  async markUserOffline(uid) {
    try {
      const userDoc = doc(db, "userSessions", uid);
      await setDoc(userDoc, {
        online: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao marcar usuário como offline:", error);
    }
  },

  // Função para obter status de presença de todos os usuários
  async getUsersPresence(userIds) {
    const presenceData = {};
    
    try {
      const promises = userIds.map(async (uid) => {
        const userDoc = doc(db, "userSessions", uid);
        const unsubscribe = onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            presenceData[uid] = {
              online: data.online || false,
              lastSeen: data.lastSeen,
              displayName: data.displayName,
              email: data.email
            };
            // Dispara evento de mudança de presença
            document.dispatchEvent(new CustomEvent("presenceChanged", { 
              detail: { uid, presence: presenceData[uid] } 
            }));
          }
        }, (error) => {
          console.warn(`[getUsersPresence] ⚠️ Erro ao monitorar presença de ${uid}:`, error);
          // Fallback: usar dados locais se Firestore falhar
          this.useLocalPresenceFallback(uid, presenceData);
        });
        
        // Retorna função para cancelar o listener
        return unsubscribe;
      });

      const unsubscribes = await Promise.all(promises);
      
      // Retorna função para cancelar todos os listeners
      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe());
      };
    } catch (error) {
      console.error("Erro ao obter presença dos usuários:", error);
      // Fallback completo se Firestore não estiver disponível
      this.useLocalPresenceFallback(userIds, presenceData);
      return () => {};
    }
  },

  // Fallback para quando Firestore não está disponível
  useLocalPresenceFallback(userIds, presenceData) {
    console.log('[useLocalPresenceFallback] 🔄 Usando fallback local para presença');
    
    // Se userIds é um array, processa todos
    if (Array.isArray(userIds)) {
      userIds.forEach(uid => {
        const localData = this.getLocalPresenceData(uid);
        presenceData[uid] = localData;
        document.dispatchEvent(new CustomEvent("presenceChanged", {
          detail: { uid, presence: localData }
        }));
      });
    } else {
      // Se userIds é um único ID
      const localData = this.getLocalPresenceData(userIds);
      presenceData[userIds] = localData;
      document.dispatchEvent(new CustomEvent("presenceChanged", {
        detail: { uid: userIds, presence: localData }
      }));
    }
  },

  // Obtém dados de presença do localStorage
  getLocalPresenceData(uid) {
    const key = `presence_${uid}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Verifica se os dados não são muito antigos (mais de 5 minutos)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (data.timestamp && data.timestamp > fiveMinutesAgo) {
          return {
            online: data.online || false,
            lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
            displayName: data.displayName || 'Usuário',
            email: data.email || ''
          };
        }
      } catch (e) {
        console.warn('[getLocalPresenceData] Erro ao parsear dados locais:', e);
      }
    }
    
    // Dados padrão se não houver dados locais
    return {
      online: false,
      lastSeen: null,
      displayName: 'Usuário',
      email: ''
    };
  },

  // Salva dados de presença no localStorage como backup
  saveLocalPresenceData(uid, data) {
    const key = `presence_${uid}`;
    const dataToStore = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(dataToStore));
  },

  notifyObservers(user) {
    this.observers.forEach((callback) => callback(user));
    document.dispatchEvent(new CustomEvent("authStateChanged", { detail: user }));
  },

  onAuthChange(callback) {
    this.observers.push(callback);
    if (this.user !== null) {
      callback(this.user);
    }
  }
};

// Inicializa o serviço de autenticação ao carregar o script
AuthService.init();

// Reexporta as dependências do Firebase para centralizar as importações
export { auth, db, analytics };
export default AuthService;