/**
 * Módulo Firebase Utils V2 - Versão Robusta
 * 
 * Funções Firebase que não afetam o usuário admin logado
 */

import { auth } from './firebase.js';
import { firebaseConfig } from '../../../config/firebase.config.js';

/**
 * Cria usuário no Firebase usando REST API PURA
 * Esta função NÃO afeta o usuário logado atual
 * 
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {Promise<Object>} - Dados do usuário criado
 */
export async function createFirebaseUserV2(email, password) {
  console.log('[createFirebaseUserV2] 🚀 Iniciando criação ROBUSTA...');
  
  try {
    // Salva o admin atual
    const adminUser = auth.currentUser;
    const adminEmail = adminUser?.email;
    
    if (!adminUser) {
      throw new Error('Admin não está logado');
    }
    
    console.log('[createFirebaseUserV2] 👤 Admin atual:', adminEmail);
    
    // Usa REST API pura - NÃO afeta o usuário logado
    const apiKey = firebaseConfig.apiKey;
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    
    console.log('[createFirebaseUserV2] 📡 Chamando REST API...');
    
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
    
    console.log('[createFirebaseUserV2] 📥 Status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Erro na API Firebase');
    }
    
    const data = await response.json();
    
    console.log('[createFirebaseUserV2] ✅ Usuário criado!');
    console.log('[createFirebaseUserV2] 🆔 UID:', data.localId);
    console.log('[createFirebaseUserV2] 📧 Email:', data.email);
    
    // Verifica se o admin ainda está logado
    const adminStillLoggedIn = auth.currentUser?.email === adminEmail;
    
    console.log('[createFirebaseUserV2] 👤 Admin ainda logado:', adminStillLoggedIn);
    
    if (!adminStillLoggedIn) {
      console.error('[createFirebaseUserV2] 🚨 ADMIN FOI DESLOGADO!');
      
      // Força logout de qualquer usuário atual
      await auth.signOut();
      
      // Salva o UID para usar depois
      localStorage.setItem('pending_firebase_uid', data.localId);
      localStorage.setItem('pending_user_email', email);
      
      console.error('[createFirebaseUserV2] 💾 UID salvo no localStorage');
      console.error('[createFirebaseUserV2] 🔄 Redirecionando para login...');
      
      // Redireciona para login
      window.location.href = 'login.html?reason=admin_logout';
      
      return {
        uid: data.localId,
        email: data.email,
        adminLoggedOut: true,
        needsRelogin: true
      };
    }
    
    // Tudo funcionou perfeitamente
    return {
      uid: data.localId,
      email: data.email,
      adminStillLoggedIn: true,
      created: true
    };
    
  } catch (error) {
    console.error('[createFirebaseUserV2] ❌ Erro:', error);
    throw error;
  }
}

/**
 * Verifica se há UIDs pendentes no localStorage
 * e tenta processá-los após o admin fazer login novamente
 */
export function processPendingFirebaseUids() {
  const pendingUid = localStorage.getItem('pending_firebase_uid');
  const pendingEmail = localStorage.getItem('pending_user_email');
  
  if (pendingUid && pendingEmail) {
    console.log('[processPendingFirebaseUids] 🔍 UID pendente encontrado!');
    console.log('[processPendingFirebaseUids] 🆔 UID:', pendingUid);
    console.log('[processPendingFirebaseUids] 📧 Email:', pendingEmail);
    
    // Remove do localStorage
    localStorage.removeItem('pending_firebase_uid');
    localStorage.removeItem('pending_user_email');
    
    return {
      uid: pendingUid,
      email: pendingEmail,
      wasPending: true
    };
  }
  
  return null;
}

/**
 * Converte erros Firebase para mensagens amigáveis
 */
export function getFirebaseErrorMessage(error) {
  const errorMap = {
    'auth/email-already-in-use': 'Este email já está em uso.',
    'auth/invalid-email': 'Email inválido.',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
    'auth/network-request-failed': 'Erro de rede.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'EMAIL_EXISTS': 'Este email já está em uso.',
    'INVALID_EMAIL': 'Email inválido.',
    'WEAK_PASSWORD': 'Senha muito fraca (mínimo 6 caracteres).',
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Muitas tentativas. Aguarde alguns minutos.'
  };
  
  const errorCode = error.code || error.message;
  return errorMap[errorCode] || `Erro no Firebase: ${error.message}`;
} 