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
import QuickCrypto from 'react-native-quick-crypto';
import { Buffer } from "buffer";
import { ReactNativeBlobUtilReadStream, ReactNativeBlobUtilWriteStream, NativeGenerateKey, NativeGenerateHash, NativeEncryptStream, NativeDecryptStream, NativeEncryptText, NativeDecryptText } from './types.native';

const alg = "aes-256-cbc"
const defaultIterations = 100000;
const bytesize = 32;

export const nativeGenerateIvv = (): Promise<string> => {
  if (!QuickCrypto.randomBytes) {
    throw new Error('nativeCrypto.randomBytes is not supported');
  }
  return Promise.resolve(QuickCrypto.randomBytes(16).toString("base64"));
};

export const nativeGenerateKey: NativeGenerateKey = async (
  password: string,
  ivv: string,
): Promise<string> => {
  if (!QuickCrypto.pbkdf2Sync) {
    throw new Error('nativeCrypto.pbkdf2Sync is not supported');
  }
  const decodedSalt = Buffer.from(ivv, "base64");
  const result =
    QuickCrypto.pbkdf2Sync(
      password,
      decodedSalt,
      defaultIterations,
      bytesize,
      "sha256"
    );
  return result.toString('base64');
};

export const nativeGenerateHash: NativeGenerateHash = async (password: string, ivv: string): Promise<string> => {
  const key = await nativeGenerateKey(password, ivv);
  return nativeGenerateKey(key, ivv);
}




export const nativeEncryptStream: NativeEncryptStream = async (
  key: string,
  ivv: string,
  inputStream: ReactNativeBlobUtilReadStream,
  outputStream: ReactNativeBlobUtilWriteStream,
  bufferSize?: number,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (!QuickCrypto.createCipheriv) {
        throw new Error('nativeCrypto.createCipheriv is not supported');
      }
      const cipher = QuickCrypto.createCipheriv(
      alg,
      Buffer.from(key, "base64"),
      Buffer.from(ivv, "base64")
    );
    // config
    inputStream.bufferSize = bufferSize ? bufferSize : inputStream.bufferSize;
    inputStream.encoding = 'base64';
    outputStream.encoding = 'utf8';
    outputStream.append = false;
    


    inputStream.open();
    inputStream.onData(async (chunk) => {
      // @ts-ignore
      const encryptedChunk = cipher.update(chunk, 'utf8', 'base64').toString();
      await outputStream.write(encryptedChunk)
    })
    inputStream.onEnd(async () => {
      const final = cipher.final('base64').toString();
      if (final.length > 0) {
        await outputStream.write(final);
      }
      await outputStream.close()
      resolve();
    })
    inputStream.onError((err) => {
      console.error(err)
      reject(err)
    })
    } catch (error) {
      reject(error)
    }
  })
};

export const nativeDecryptStream: NativeDecryptStream = async (
  key: string,
  ivv: string,
  inputStream: ReactNativeBlobUtilReadStream,
  outputStream: ReactNativeBlobUtilWriteStream,
  bufferSize?: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
     try {
    if (!QuickCrypto.createDecipheriv) {
      throw new Error('nativeCrypto.createDecipheriv is not supported');
    }
    const decipher = QuickCrypto.createDecipheriv(
      alg,
      Buffer.from(key, "base64"),
      Buffer.from(ivv, "base64")
    );
    // config 
    inputStream.bufferSize = bufferSize ? bufferSize : inputStream.bufferSize;
    inputStream.encoding = 'utf8';
    outputStream.encoding = 'base64';
    outputStream.append = false;

    inputStream.open();
    inputStream.onData(async (chunk) => {
      // @ts-ignore
      const decryptedChunk = decipher.update(chunk, 'base64', 'utf8').toString();
      await outputStream.write(decryptedChunk);
    })
    inputStream.onEnd(async () => {
      const final = decipher.final('utf8').toString();
      if (final.length > 0) {
        await outputStream.write(final);
      }
      await outputStream.close();
      resolve();
    })
    inputStream.onError((err) => {
      console.error(err)
      reject(err)
    })
  } catch (err) {
    console.error("from native module :: ", err);
    reject(err)
  }
  })
};

export const nativeEncryptText: NativeEncryptText = (
  key: string,
  ivv: string,
  text: string,
): string => {
  try {
    if (!QuickCrypto.createCipheriv) {
      throw new Error('nativeCrypto.createCipheriv is not supported');
    }
    const cipher = QuickCrypto.createCipheriv(
      alg,
      Buffer.from(key, "base64"),
      Buffer.from(ivv, "base64")
    );
    const encrypted = cipher.update(text, "utf8", "base64").toString();
    const final = cipher.final("base64").toString()
    return encrypted + final;
  } catch (e) {
    console.error("from native module :: ", e);
    throw e;
  }
};

/**
 * Asynchronously encrypts text using the provided key and initialization vector (IV),
 * and invokes the specified event handler with the decrypted result.
 */
export const nativeDecryptText: NativeDecryptText = (
  key: string,
  ivv: string,
  text: string,
): string => {
  try {
    if (!QuickCrypto.createDecipheriv) {
      throw new Error('nativeCrypto.createDecipheriv is not supported');
    }
    const cipher = QuickCrypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "base64"),
      Buffer.from(ivv, "base64")
    );
    const decrypted = cipher.update(text, "base64", "utf8").toString() 
    const final = cipher.final("utf8").toString()
    return decrypted + final;
  } catch (e) {
    console.error("from native module :: ", e);
    throw e;
  }
};