// Utilidades de conversión Base64URL y WebAuthn
export function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64URLToBuffer(base64url: string): ArrayBuffer {
  if (!base64url) return new Uint8Array(0).buffer;
  try {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return new TextEncoder().encode(base64url).buffer;
  }
}

export function getValidRpId(serverRpId?: string): string {
  if (typeof window === 'undefined') return 'localhost';
  const currentHost = window.location.hostname;
  if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.includes(':')) {
    return currentHost;
  }
  if (serverRpId && currentHost.endsWith(serverRpId)) {
    return serverRpId;
  }
  return currentHost;
}

export async function isPasskeySupported(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export interface RegisterPasskeyOptions {
  challenge: string;
  rp: {
    name: string;
    id?: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams?: Array<{ alg: number; type: PublicKeyCredentialType }>;
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  excludeCredentials?: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
}

export async function registerWebAuthnPasskey(options: RegisterPasskeyOptions) {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: base64URLToBuffer(options.challenge),
    rp: {
      name: options.rp.name,
      id: getValidRpId(options.rp.id),
    },
    user: {
      id: new TextEncoder().encode(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: (options.pubKeyCredParams as PublicKeyCredentialParameters[]) || [
      { alg: -7, type: 'public-key' as const }, // ES256
      { alg: -257, type: 'public-key' as const }, // RS256
    ],
    timeout: options.timeout || 60000,
    authenticatorSelection: options.authenticatorSelection || {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    attestation: options.attestation || 'none',
    excludeCredentials: options.excludeCredentials?.map((cred) => ({
      id: base64URLToBuffer(cred.id),
      type: cred.type,
      transports: cred.transports,
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  if (!credential) {
    throw new Error('No se pudo crear la credencial');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      attestationObject: bufferToBase64URL(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    },
  };
}

export interface AuthPasskeyOptions {
  challenge: string;
  rpId?: string;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  allowCredentials?: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
}

export async function authenticateWebAuthnPasskey(options: AuthPasskeyOptions) {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64URLToBuffer(options.challenge),
    rpId: getValidRpId(options.rpId),
    timeout: options.timeout || 60000,
    userVerification: options.userVerification || 'required',
    allowCredentials: options.allowCredentials?.map((cred) => ({
      id: base64URLToBuffer(cred.id),
      type: cred.type,
      transports: cred.transports,
    })),
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  if (!credential) {
    throw new Error('No se seleccionó ninguna credencial');
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64URL(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      authenticatorData: bufferToBase64URL(response.authenticatorData),
      signature: bufferToBase64URL(response.signature),
      userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : null,
    },
  };
}
