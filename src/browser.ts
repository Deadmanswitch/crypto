// -----------------------------------------------------------------------------
//  Copyright (c) 2025 Deadmanswitch.com, Inc.
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.
// -----------------------------------------------------------------------------

import type { BrowserGenerateKey, BrowserGenerateHash, BrowserDecryptText } from './types.browser';

/**
 * Generates base64 encoded encryption key from provided password and initialization vector (IV).
 */
export const browserGenerateKey: BrowserGenerateKey = async (password: string, ivv: string): Promise<string> => {
  if (!crypto.subtle?.importKey) {
    throw new Error('browserCrypto.subtle.importKey is not supported');
  }

  const encoder = new TextEncoder();
  const iterations = 100000;
  const bytesize = 32;
  const keyData = encoder.encode(password)

  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: Buffer.from(ivv, 'base64'),
      iterations,
      hash: 'SHA-256',
    },
    importedKey,
    bytesize * 8,
  );

  const result = Buffer.from(derivedBits).toString('base64')

  return Promise.resolve(result);
};

/**
 * Generates base64 encoded encryption hash from provided key and initialization vector (IV).
 * Output hash could be safely stored and used as a fingerprint without exposing original password.
 */
export const browserGenerateHash: BrowserGenerateHash = async (password: string, ivv: string): Promise<string> => {
  const key = await browserGenerateKey(password, ivv);
  const result = (await browserGenerateKey(key, ivv)).toString();
  return Promise.resolve(result)
}

/**
 * Asynchronously encrypts text using the provided key and initialization vector (IV),
 * and invokes the specified event handler with the encrypted result.
 */
export const browserEncryptText = async (key: string, ivv: string, text: string, event: (cipher: string) => void): Promise<void> => {
  if (!crypto.subtle?.importKey) {
    throw new Error('browserCrypto.subtle.importKey is not supported');
  }
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    Buffer.from(key, 'base64'),
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );

  const encryptedText = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: Buffer.from(ivv, 'base64') },
    importedKey,
    new TextEncoder().encode(text)
  );

  event(Buffer.from(encryptedText).toString('base64'));

  return Promise.resolve();
};

/**
 * Asynchronously decrypts text using the provided key and initialization vector (IV),
 * and invokes the specified event handler with the decrypted result.
 */
export const browserDecryptText: BrowserDecryptText = async (key: string, ivv: string, text: string, event: (cipher: string) => void): Promise<void> => {
  if (!crypto.subtle?.importKey) {
    throw new Error('browserCrypto.subtle.importKey is not supported');
  }
  const importedKey = await crypto.subtle.importKey(
    'raw',
    Buffer.from(key, 'base64'),
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const decryptedText = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: Buffer.from(ivv, 'base64'), },
    importedKey,
    Buffer.from(text, 'base64')
  );

  event(new TextDecoder().decode(decryptedText));

  return Promise.resolve();
}
