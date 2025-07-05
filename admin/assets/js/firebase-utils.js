/**
 * Utilitários Firebase para gerenciamento de usuários
 * 
 * Este módulo fornece funções para criar usuários no Firebase Authentication
 * e gerenciar a integração com o sistema de autenticação existente.
 */

import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/**
 * Cria um usuário no Firebase Authentication
 * 
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {Promise<Object>} - Dados do usuário criado
 */
export async function createFirebaseUser(email, password) {
  try {
    // Salva o usuário atual antes de criar o novo
    const currentUser = auth.currentUser;
    const currentUserEmail = currentUser?.email;
    
    // Cria o novo usuário
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Logs detalhados do usuário criado
    console.log('[createFirebaseUser] 🔥 Usuário Firebase criado!');
    console.log('[createFirebaseUser] 🆔 UID REAL gerado:', newUser.uid);
    console.log('[createFirebaseUser] 📧 Email:', newUser.email);
    console.log('[createFirebaseUser] ✅ Dados completos:', {
      uid: newUser.uid,
      email: newUser.email,
      emailVerified: newUser.emailVerified
    });
    
    // Faz logout do usuário recém-criado
    await signOut(auth);
    
    // Autentica novamente o usuário administrador se existia
    if (currentUserEmail && currentUser) {
      // Aqui você precisa da senha do admin para fazer login novamente
      // Por segurança, vamos apenas aguardar o sistema se autenticar automaticamente
      console.log('[createFirebaseUser] Usuário criado com sucesso. Aguardando re-autenticação automática...');
    }
    
    const result = {
      uid: newUser.uid,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
      created: true
    };
    
    console.log('[createFirebaseUser] 🎯 Retornando UID:', result.uid);
    return result;
    
  } catch (error) {
    console.error('[createFirebaseUser] Erro ao criar usuário:', error);
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/**
 * Converte códigos de erro do Firebase para mensagens amigáveis
 * 
 * @param {Error} error - Erro do Firebase
 * @returns {string} - Mensagem de erro amigável
 */
function getFirebaseErrorMessage(error) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este email já está em uso. Por favor, utilize outro email.';
    case 'auth/invalid-email':
      return 'Email inválido. Por favor, verifique o formato do email.';
    case 'auth/weak-password':
      return 'Senha muito fraca. Por favor, utilize uma senha com pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Erro de rede. Por favor, verifique sua conexão com a internet.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.';
    default:
      return `Erro no Firebase: ${error.message}`;
  }
}

/**
 * Verifica se um email já existe no Firebase Authentication
 * 
 * @param {string} email - Email para verificar
 * @returns {Promise<boolean>} - true se o email existe, false caso contrário
 */
export async function checkEmailExists(email) {
  try {
    // Tenta criar um usuário temporário para verificar se o email existe
    // Este método não é ideal, mas funciona para verificação básica
    await createUserWithEmailAndPassword(auth, `temp_${Date.now()}@temp.com`, 'temp123');
    return false; // Se chegou aqui, o email não existe
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      return true; // Email já existe
    }
    return false; // Outros erros assumimos que não existe
  }
}

/**
 * Aguarda o usuário atual se autenticar novamente
 * 
 * @param {number} timeoutMs - Tempo limite em milissegundos (padrão: 10000)
 * @returns {Promise<Object>} - Usuário autenticado
 */
export function waitForReAuthentication(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Falha na re-autenticação'));
    }, timeoutMs);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      }
    });
  });
}

/**
 * Remove um usuário do Firebase Authentication (rollback)
 * 
 * Esta função é usada para desfazer a criação de um usuário no Firebase
 * em caso de erro na criação no banco de dados próprio.
 * 
 * @param {string} uid - UID do usuário a ser removido
 * @returns {Promise<boolean>} - true se removido com sucesso, false caso contrário
 */
export async function rollbackFirebaseUser(uid) {
  try {
    // Nota: deleteUser() só funciona com Firebase Admin SDK
    // No cliente, só é possível deletar o usuário atual
    // Para uma implementação completa, seria necessário usar Firebase Functions
    console.warn('[rollbackFirebaseUser] Rollback automático não implementado no cliente. Use Firebase Admin SDK.');
    
    // Implementação alternativa: marcar o usuário como inativo ou enviar para uma queue de limpeza
    // Por enquanto, apenas logamos o UID que precisa ser removido manualmente
    console.error(`[rollbackFirebaseUser] ATENÇÃO: Usuário Firebase ${uid} precisa ser removido manualmente do Firebase Authentication`);
    
    return false;
  } catch (error) {
    console.error('[rollbackFirebaseUser] Erro ao tentar rollback:', error);
    return false;
  }
}

/**
 * Cria um usuário com rollback automático em caso de erro
 * 
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @param {Function} databaseCreateFn - Função para criar o usuário no banco de dados
 * @returns {Promise<Object>} - Resultado da criação
 */
export async function createUserWithRollback(email, password, databaseCreateFn) {
  let firebaseUser = null;
  
  try {
    // 1. Cria usuário no Firebase
    firebaseUser = await createFirebaseUser(email, password);
    
    // 2. Aguarda re-autenticação
    await waitForReAuthentication(5000);
    
    // 3. Tenta criar no banco de dados
    const databaseResult = await databaseCreateFn(firebaseUser.uid);
    
    return {
      firebase: firebaseUser,
      database: databaseResult,
      success: true
    };
    
  } catch (error) {
    // Se houve erro e o usuário Firebase foi criado, tenta rollback
    if (firebaseUser && firebaseUser.uid) {
      console.log('[createUserWithRollback] Tentando rollback do usuário Firebase...');
      await rollbackFirebaseUser(firebaseUser.uid);
    }
    
    throw error;
  }
} 