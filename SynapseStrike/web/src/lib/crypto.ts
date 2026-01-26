export interface EncryptedPayload {
  wrappedKey: string // RSA-OAEP(K)
  iv: string // 12 bytes
  ciphertext: string // AES-GCM output(contain tag)
  aad?: string // optional：Additional auth data
  kid?: string // optional：server public key ID
  ts?: number // optional：unix seconds，used forreplay protection
}

export interface CryptoConfig {
  transport_encryption: boolean
}

export interface WebCryptoEnvironmentInfo {
  isBrowser: boolean
  isSecureContext: boolean
  hasSubtleCrypto: boolean
  origin?: string
  protocol?: string
  hostname?: string
  isLocalhost?: boolean
}

export class CryptoService {
  private static publicKey: CryptoKey | null = null
  private static publicKeyPEM: string | null = null
  private static _transportEncryption: boolean | null = null

  static get transportEncryption(): boolean {
    return this._transportEncryption === true
  }

  static async initialize(publicKeyPEM: string) {
    if (this.publicKey && this.publicKeyPEM === publicKeyPEM) {
      return
    }
    this.publicKeyPEM = publicKeyPEM
    this.publicKey = await this.importPublicKey(publicKeyPEM)
  }

  static async fetchCryptoConfig(): Promise<CryptoConfig> {
    const response = await fetch('/api/crypto/config')
    if (!response.ok) {
      throw new Error(`Failed to fetch crypto config: ${response.statusText}`)
    }
    const data = await response.json()
    this._transportEncryption = data.transport_encryption
    return data
  }

  private static async importPublicKey(pem: string): Promise<CryptoKey> {
    const pemHeader = '-----BEGIN PUBLIC KEY-----'
    const pemFooter = '-----END PUBLIC KEY-----'
    const headerIndex = pem.indexOf(pemHeader)
    const footerIndex = pem.indexOf(pemFooter)

    if (
      headerIndex === -1 ||
      footerIndex === -1 ||
      headerIndex >= footerIndex
    ) {
      throw new Error('Invalid PEM formatted public key')
    }

    const pemContents = pem
      .substring(headerIndex + pemHeader.length, footerIndex)
      .replace(/\s+/g, '') // removeallemptywhite textchar（including linelinechar、spaceetc）

    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i)
    }

    return crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    )
  }

  static async encryptSensitiveData(
    plaintext: string,
    userId?: string,
    sessionId?: string
  ): Promise<EncryptedPayload> {
    if (!this.publicKey) {
      throw new Error(
        'Crypto service not initialized. Call initialize() first.'
      )
    }

    // 1. Generate 256-bit AES key
    const aesKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt']
    )

    // 2. Generate 12 bytes random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // 3. prepare AAD (Additional auth data)
    const ts = Math.floor(Date.now() / 1000)
    const aadObject = {
      userId: userId || '',
      sessionId: sessionId || '',
      ts: ts,
      purpose: 'sensitive_data_encryption',
    }
    const aadString = JSON.stringify(aadObject)
    const aadBytes = new TextEncoder().encode(aadString)

    // 4. Use AES-GCM encryptdata
    const plaintextBytes = new TextEncoder().encode(plaintext)
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aadBytes,
        tagLength: 128, // 16 bytes tag
      },
      aesKey,
      plaintextBytes
    )

    // 5. export AES key
    const rawAesKey = await crypto.subtle.exportKey('raw', aesKey)

    // 6. Use RSA-OAEP encrypt AES key
    const wrappedKey = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      this.publicKey,
      rawAesKey
    )

    // 7. encode as base64url
    return {
      wrappedKey: this.arrayBufferToBase64Url(wrappedKey),
      iv: this.arrayBufferToBase64Url(iv.buffer),
      ciphertext: this.arrayBufferToBase64Url(ciphertext),
      aad: this.arrayBufferToBase64Url(aadBytes.buffer),
      ts: ts,
    }
  }

  private static arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  static async fetchPublicKey(): Promise<string> {
    const response = await fetch('/api/crypto/public-key')
    if (!response.ok) {
      throw new Error(`Failed to fetch public key: ${response.statusText}`)
    }
    const data = await response.json()
    // Update transport encryption flag from server response
    if (typeof data.transport_encryption === 'boolean') {
      this._transportEncryption = data.transport_encryption
    }
    return data.public_key || ''
  }

  static async decryptSensitiveData(
    payload: EncryptedPayload
  ): Promise<string> {
    const response = await fetch('/api/crypto/decrypt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Decryption failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.plaintext
  }
}

// Generateobfuscate charcharstring（used forclipboard obfuscation）
export function generateObfuscation(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

// validate private key format
export function validatePrivateKeyFormat(
  value: string,
  expectedLength: number = 64
): boolean {
  const normalized = value.startsWith('0x') ? value.slice(2) : value
  if (normalized.length !== expectedLength) {
    return false
  }
  return /^[0-9a-fA-F]+$/.test(normalized)
}

export function diagnoseWebCryptoEnvironment(): WebCryptoEnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isBrowser: false,
      isSecureContext: false,
      hasSubtleCrypto: false,
    }
  }

  const { location } = window
  const hostname = location?.hostname
  const protocol = location?.protocol
  const origin = location?.origin
  const isLocalhost = hostname
    ? ['localhost', '127.0.0.1', '::1'].includes(hostname)
    : false

  const secureContext =
    typeof window.isSecureContext === 'boolean'
      ? window.isSecureContext
      : protocol === 'https:' || (protocol === 'http:' && isLocalhost)

  const hasSubtleCrypto =
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'

  return {
    isBrowser: true,
    isSecureContext: secureContext,
    hasSubtleCrypto,
    origin: origin || undefined,
    protocol: protocol || undefined,
    hostname,
    isLocalhost,
  }
}
