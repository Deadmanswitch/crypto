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

let nativeCrypto: {
  randomBytes: Function;
  pbkdf2Sync: Function;
  createCipheriv: Function;
  createDecipheriv: Function;
};

export const nativeInit = (crypto: any) => {
  nativeCrypto = crypto;
};

global.Buffer = require("buffer").Buffer;

/**
 * Generates base64 encoded initialization vector from random bytes.
 * base64 encoding converts every 3 bytes of data into 4 characters, with '=' padding added if necessary to ensure a valid representation.
 */
export const nativeGenerateIvv = (): Promise<string> => {
  if (!nativeCrypto.randomBytes) {
    throw new Error("nativeCrypto.randomBytes is not supported");
  }

  return Promise.resolve(nativeCrypto.randomBytes(16).toString("base64"));
};

/**
 * Generates base64 encoded encryption key from provided password and initialization vector (IV).
 */
export const nativeGenerateKey = async (
  password: string|Uint8Array,
  ivv: string,
  base64Encoded: boolean
): Promise<string|Uint8Array> => {
  if (!nativeCrypto.randomBytes) {
    throw new Error("nativeCrypto.randomBytes is not supported");
  }

  const iterations = 100000;
  const bytesize = 32;
  const decodedSalt = Buffer.from(ivv, "base64");

  const result =
    nativeCrypto.pbkdf2Sync(
      password,
      decodedSalt,
      iterations,
      bytesize,
      "sha256"
    )
  return base64Encoded? result.toString('base64'): new Uint8Array(result.buffer);
};

/**
 * Generates base64 encoded encryption hash from provided key and initialization vector (IV).
 * Output hash could be safely stored and used as a fingerprint without exposing original password.
 */
export const nativeGenerateHash = async (
  password: string,
  ivv: string,
  base64Encoded: boolean
): Promise<string> => {
  const key = await nativeGenerateKey(password, ivv, base64Encoded);
  const result = (await nativeGenerateKey(key, ivv, base64Encoded)).toString();
  return Promise.resolve(result);
};

/**
 * Asynchronously encrypts text using the provided key and initialization vector (IV),
 * and invokes the specified event handler with the decrypted result.
 */
export const nativeEncryptText = async (
  key: string,
  ivv: string,
  text: string,
  event: (cipher: string) => void
): Promise<void> => {
  if (!nativeCrypto.createCipheriv) {
    throw new Error("nativeCrypto.createCipheriv is not supported");
  }
  try {
    const cipher = nativeCrypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(key, "base64"),
      Buffer.from(ivv, "base64")
    );
    event(cipher.update(text, "utf8", "base64").toString());
    event(cipher.final("base64").toString());
    return Promise.resolve();
  } catch (e) {
    console.error("from native module :: ", e);
    return Promise.reject();
  }
};

/**
 * Asynchronously encrypts text using the provided key and initialization vector (IV),
 * and invokes the specified event handler with the decrypted result.
 */
export const nativeDecryptText = async (
  key: string,
  ivv: string,
  text: string,
  event: (cipher: string) => void
): Promise<void> => {
  if (!nativeCrypto.createCipheriv) {
    throw new Error("nativeCrypto.createCipheriv is not supported");
  }
  try {
    const cipher = nativeCrypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "base64"),
      Buffer.from(ivv, "base64")
    );
    event(cipher.update(text, "base64", "utf8").toString());
    event(cipher.final("utf8").toString());
    return Promise.resolve();
  } catch (e) {
    console.error("from native module :: ", e);
    return Promise.reject();
  }
};
