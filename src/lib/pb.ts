import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Generar un ID de dispositivo único y persistente para el Gestor de Sesiones
let deviceId = localStorage.getItem('rs_device_id');
if (!deviceId) {
  deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  localStorage.setItem('rs_device_id', deviceId);
}

// Interceptar todas las peticiones para adjuntar las cabeceras de sesión
pb.beforeSend = function (url, options) {
  options.headers = Object.assign({}, options.headers, {
    'X-Device-Id': deviceId,
    'X-App-Name': 'REDSOUTH Web',
    'X-Client-User-Agent': typeof navigator !== 'undefined' ? navigator.userAgent : '',
  });
  return { url, options };
};

// Cookie sync helper for shared auth across *.redsouth.eu
const COOKIE_NAME = 'rs_auth';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : null;
}

function setSharedCookie(name: string, value: string, days: number = 30) {
  if (typeof document === 'undefined') return;
  const isZmito = window.location.hostname.endsWith('redsouth.eu');
  const domain = isZmito ? '; domain=.redsouth.eu' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}${domain}; SameSite=Lax${secure}`;
}

function removeSharedCookie(name: string) {
  if (typeof document === 'undefined') return;
  const isZmito = window.location.hostname.endsWith('redsouth.eu');
  const domain = isZmito ? '; domain=.redsouth.eu' : '';
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain}; SameSite=Lax`;
}

// If localStorage auth is empty but shared cookie exists, hydrate pb.authStore
if (!pb.authStore.isValid) {
  const cookieVal = getCookie(COOKIE_NAME);
  if (cookieVal) {
    try {
      const parsed = JSON.parse(cookieVal);
      if (parsed.token && parsed.model) {
        pb.authStore.save(parsed.token, parsed.model);
      }
    } catch {
      // ignore
    }
  }
}

// Sync changes to the shared cookie
pb.authStore.onChange((token, model) => {
  if (token && model) {
    setSharedCookie(COOKIE_NAME, JSON.stringify({ token, model }));
  } else {
    removeSharedCookie(COOKIE_NAME);
  }
});
