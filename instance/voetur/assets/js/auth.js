import { auth, db, analytics } from "./firebase.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const AuthService = {
  user: null,
  observers: [],

  init() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      if (user) {
        this.saveUserSession(user);
      }
      this.notifyObservers(user);
    });
  },

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.user = userCredential.user;
      this.saveUserSession(this.user);
      this.notifyObservers(this.user);
      return { success: true, user: this.user };
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      return { success: false, error: error.message };
    }
  },

  async logout() {
    try {
      await signOut(auth);
      this.user = null;
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
    return setDoc(userDoc, {
      email: user.email,
      displayName: user.displayName || "Usuário Anônimo",
      lastLogin: serverTimestamp()
    }, { merge: true });
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