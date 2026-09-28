/**
 * src/services/firebase.js
 *
 * Módulo centralizado do Firebase usando a API modular v9+.
 * Todos os serviços são inicializados de forma lazy (sob demanda)
 * por meio de getters, garantindo tree-shaking agressivo e evitando
 * que o SDK seja carregado antes de ser realmente necessário.
 *
 * Variáveis de ambiente esperadas no arquivo .env (prefixo VITE_):
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *   VITE_FIREBASE_MEASUREMENT_ID  (opcional – Analytics)
 *   VITE_FIREBASE_VAPID_KEY        (opcional – Push Messaging)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';

// ── Configuração ──────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ── App singleton (evita re-inicialização em hot-reload) ──────────────────────
function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// ── Lazy getters – cada serviço é importado e instanciado apenas quando
//    acessado pela primeira vez, permitindo que o Rollup crie chunks separados.
// ─────────────────────────────────────────────────────────────────────────────

/** Firebase Auth – chunk: firebase_core */
export async function getAuth() {
  const { getAuth: _getAuth } = await import('firebase/auth');
  return _getAuth(getFirebaseApp());
}

/** Cloud Firestore – chunk: firebase_realtime */
export async function getFirestore() {
  const { getFirestore: _getFirestore } = await import('firebase/firestore');
  return _getFirestore(getFirebaseApp());
}

/** Firebase Cloud Messaging – chunk: firebase_realtime */
export async function getMessaging() {
  const { getMessaging: _getMessaging, isSupported } = await import('firebase/messaging');

  if (!(await isSupported())) {
    console.warn('[Firebase] FCM não suportado neste navegador.');
    return null;
  }

  return _getMessaging(getFirebaseApp());
}

/**
 * Solicita permissão de notificação e retorna o token FCM.
 * @param {string} vapidKey - Chave VAPID pública do projeto Firebase.
 * @returns {Promise<string|null>} Token FCM ou null em caso de falha/suporte ausente.
 */
export async function requestNotificationToken(
  vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY,
) {
  const messaging = await getMessaging();
  if (!messaging) return null;

  const { getToken } = await import('firebase/messaging');

  try {
    const token = await getToken(messaging, { vapidKey });
    return token ?? null;
  } catch (err) {
    console.error('[Firebase] Erro ao obter token FCM:', err);
    return null;
  }
}

// ── Exportação da instância do App para casos onde é necessário diretamente ───
export { getFirebaseApp };
