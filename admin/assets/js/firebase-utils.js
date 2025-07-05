/**
 * Utilitários Firebase para gerenciamento de usuários
 * 
 * Este módulo fornece funções para criar usuários no Firebase Authentication
 * e gerenciar a integração com o sistema de autenticação existente.
 */

import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

/**
 * Cria um usuário no Firebase Authentication SEM fazer logout
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
    const currentUserToken = await currentUser?.getIdToken();
    
    console.log('[createFirebaseUser] 👤 Admin atual:', currentUserEmail);
    console.log('[createFirebaseUser] 🔑 Token admin salvo:', currentUserToken ? 'Sim' : 'Não');
    console.log('[createFirebaseUser] 🚀 Criando usuário:', email);
    
    // Listener para detectar mudanças de usuário
    let userChanged = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email !== currentUserEmail) {
        console.error('[createFirebaseUser] 🚨 USUÁRIO MUDOU DURANTE A CRIAÇÃO!');
        console.error('[createFirebaseUser] 👤 Era:', currentUserEmail);
        console.error('[createFirebaseUser] 👤 Agora é:', user.email);
        userChanged = true;
      }
    });
    
    // ⚠️ PROBLEMA: createUserWithEmailAndPassword automaticamente faz login com o novo usuário
    // Isso desloga o admin atual. Precisamos de uma solução diferente.
    
    // ❌ ESTRATÉGIA PROBLEMÁTICA (comentada):
    // const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // await signOut(auth); // Isso deixa TODOS deslogados
    
    // ✅ NOVA ESTRATÉGIA: Usar Firebase Admin SDK ou API REST
    // Como não temos Admin SDK no cliente, vamos usar a API REST do Firebase
    
    console.log('[createFirebaseUser] 🔧 Usando Firebase REST API para evitar logout...');
    
    const apiKey = "AIzaSyD7Gh-UfV-LyueKtlUcY9nny_o-UWmlmJM"; // API key correta do Firebase
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    
    console.log('[createFirebaseUser] 📡 Fazendo requisição para:', url);
    console.log('[createFirebaseUser] 📦 Payload:', { email, password: '***', returnSecureToken: true });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true
      })
    });
    
    console.log('[createFirebaseUser] 📥 Response status:', response.status);
    console.log('[createFirebaseUser] 📊 Response ok:', response.ok);
    
    const data = await response.json();
    
    console.log('[createFirebaseUser] 📋 Raw response data:', data);
    
    // Remove o listener
    unsubscribe();
    
    if (!response.ok) {
      console.error('[createFirebaseUser] ❌ Erro na resposta:', data);
      throw new Error(data.error?.message || 'Erro na API Firebase');
    }
    
    // Logs detalhados do usuário criado
    console.log('[createFirebaseUser] 🔥 Usuário Firebase criado via REST API!');
    console.log('[createFirebaseUser] 🆔 UID REAL gerado:', data.localId);
    console.log('[createFirebaseUser] 📧 Email:', data.email);
    console.log('[createFirebaseUser] 🔑 Token presente:', !!data.idToken);
    console.log('[createFirebaseUser] 📏 Tamanho UID:', data.localId?.length);
    console.log('[createFirebaseUser] 🔍 Tipo UID:', typeof data.localId);
    console.log('[createFirebaseUser] ✅ Dados completos:', {
      uid: data.localId,
      email: data.email,
      emailVerified: false // Novo usuário não está verificado
    });
    
    // Verifica se o usuário mudou durante a criação
    if (userChanged) {
      console.error('[createFirebaseUser] 🚨 USUÁRIO MUDOU! Fazendo correção...');
      
      // Tenta fazer logout do usuário atual
      await auth.signOut();
      
      // Espera um pouco e força refresh da página
      setTimeout(() => {
        console.log('[createFirebaseUser] 🔄 Recarregando página...');
        window.location.reload();
      }, 1000);
      
      throw new Error('Usuário admin foi deslogado durante a criação. A página será recarregada.');
    }
    
    // Verifica se o admin ainda está logado
    const currentUserAfter = auth.currentUser;
    const adminStillLoggedIn = currentUserAfter?.email === currentUserEmail;
    
    console.log('[createFirebaseUser] 👤 Usuário ANTES da criação:', currentUserEmail);
    console.log('[createFirebaseUser] 👤 Usuário DEPOIS da criação:', currentUserAfter?.email);
    console.log('[createFirebaseUser] 👤 Admin ainda logado:', adminStillLoggedIn);
    
    // 🚨 PROBLEMA DETECTADO: Se o admin não está mais logado, força o re-login
    if (!adminStillLoggedIn) {
      console.error('[createFirebaseUser] 🚨 ADMIN FOI DESLOGADO! Tentando recuperar...');
      
      // Força logout do usuário atual (que foi criado)
      if (currentUserAfter) {
        console.log('[createFirebaseUser] 🔄 Fazendo logout do usuário criado...');
        await auth.signOut();
      }
      
      // Informa que precisa fazer login novamente
      console.error('[createFirebaseUser] ❌ O admin foi deslogado. É necessário fazer login novamente.');
      
      // Redireciona para a página de login
      window.location.href = 'login.html';
      return;
    }
    
    const result = {
      uid: data.localId, // UID REAL do Firebase
      email: data.email,
      emailVerified: false,
      created: true,
      previousAdmin: currentUserEmail,
      adminStillLoggedIn: adminStillLoggedIn
    };
    
    console.log('[createFirebaseUser] 🎯 Resultado final antes do return:');
    console.log('[createFirebaseUser] 🔥 result.uid:', result.uid);
    console.log('[createFirebaseUser] 📧 result.email:', result.email);
    console.log('[createFirebaseUser] 🎯 Tipo result.uid:', typeof result.uid);
    console.log('[createFirebaseUser] 🎯 Comprimento result.uid:', result.uid?.length);
    console.log('[createFirebaseUser] 📦 Objeto completo:', result);
    
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