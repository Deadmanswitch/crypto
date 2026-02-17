import { 
  nativeEncryptText, 
  nativeDecryptText, 
  nativeEncryptStream, 
  nativeDecryptStream,
  nativeGenerateKey,
  nativeGenerateIvv
} from '../src/native';
import { 
  browserEncryptText, 
  browserDecryptText,
  browserGenerateKey
} from '../src/browser';
import { ReactNativeBlobUtilReadStream, ReactNativeBlobUtilWriteStream } from '../src/types.native';
import { Buffer } from 'buffer';

// Mock react-native-quick-crypto using node:crypto to have a real functional implementation for tests
jest.mock('react-native-quick-crypto', () => {
  const crypto = require('node:crypto');
  return {
    __esModule: true,
    default: {
      createCipheriv: (alg: string, key: Buffer, iv: Buffer) => crypto.createCipheriv(alg, key, iv),
      createDecipheriv: (alg: string, key: Buffer, iv: Buffer) => crypto.createDecipheriv(alg, key, iv),
      randomBytes: (size: number) => crypto.randomBytes(size),
      pbkdf2Sync: (pass: string, salt: Buffer, iter: number, keylen: number, digest: string) => 
        crypto.pbkdf2Sync(pass, salt, iter, keylen, digest),
    },
  };
});

// Mock browser crypto using Node's webcrypto
const { webcrypto } = require('node:crypto');
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
});

/**
 * Mock implementation of ReactNativeBlobUtilReadStream that simulates 
 * encoding behavior and chunked reading.
 */
class MockReadStream implements ReactNativeBlobUtilReadStream {
  path = 'mock-path';
  encoding: any = 'utf8';
  bufferSize = 1024;
  closed = false;
  tick = 0;
  private buffer: Buffer;
  private onDataFn: (chunk: string) => void = () => {};
  private onEndFn: () => void = () => {};
  private onErrorFn: (err: any) => void = () => {};

  constructor(data: string | Buffer) {
    this.buffer = typeof data === 'string' ? Buffer.from(data) : data;
  }

  open() {
    // We use setImmediate to simulate the asynchronous nature of streams
    setImmediate(() => {
      try {
        // Simulate how ReactNativeBlobUtilReadStream respects the encoding property
        let dataToPush: string;
        if (this.encoding === 'base64') {
          dataToPush = this.buffer.toString('base64');
        } else {
          dataToPush = this.buffer.toString('utf8');
        }
        
        const chunkSize = this.bufferSize || 1024;
        for (let i = 0; i < dataToPush.length; i += chunkSize) {
          this.onDataFn(dataToPush.substring(i, i + chunkSize));
        }
        this.onEndFn();
      } catch (err) {
        this.onErrorFn(err);
      }
    });
  }

  onData(fn: (chunk: string) => void) { this.onDataFn = fn; }
  onEnd(fn: () => void) { this.onEndFn = fn; }
  onError(fn: (err: any) => void) { this.onErrorFn = fn; }
}

/**
 * Mock implementation of ReactNativeBlobUtilWriteStream that simulates
 * encoding behavior and collects written data.
 */
class MockWriteStream implements ReactNativeBlobUtilWriteStream {
  id = 'mock-write-id';
  encoding = 'utf8';
  append = false;
  private chunks: Buffer[] = [];

  async write(data: string) {
    // Simulate how ReactNativeBlobUtilWriteStream respects the encoding property
    if (this.encoding === 'base64') {
      // If encoding is base64, it means the input 'data' is a base64 string 
      // representing binary data to be written.
      this.chunks.push(Buffer.from(data, 'base64'));
    } else {
      // Otherwise treat it as utf8 text
      this.chunks.push(Buffer.from(data, 'utf8'));
    }
  }

  async close() {}

  getBuffer() {
    return Buffer.concat(this.chunks);
  }

  getString() {
    return this.getBuffer().toString('utf8');
  }
}

describe('Round-trip Encryption Verification', () => {
  const password = 'extremely-secure-test-password-1234567890';
  let key: string;
  let iv: string;

  beforeAll(async () => {
    iv = await nativeGenerateIvv();
    key = await nativeGenerateKey(password, iv);
  });

  describe('Native Crypto Functions', () => {
    describe('nativeEncryptText and nativeDecryptText', () => {
      it('should successfully round-trip a long string (100KB)', () => {
        // Create a long string with some variety to ensure patterns don't cause issues
        const longString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(2000);
        
        const encrypted = nativeEncryptText(key, iv, longString);
        expect(encrypted).not.toBe(longString);
        expect(encrypted.length).toBeGreaterThan(0);

        const decrypted = nativeDecryptText(key, iv, encrypted);
        expect(decrypted).toBe(longString);
      });

      it('should successfully round-trip a very long string (500KB)', () => {
        const longString = 'X'.repeat(500 * 1024);
        
        const encrypted = nativeEncryptText(key, iv, longString);
        const decrypted = nativeDecryptText(key, iv, encrypted);
        expect(decrypted).toBe(longString);
      });
    });

    describe('nativeEncryptStream and nativeDecryptStream', () => {
      it('should successfully round-trip a long string via streams (100KB)', async () => {
        const longString = 'Stream data test. '.repeat(5000);
        
        // Step 1: Encrypt stream
        const inputStream1 = new MockReadStream(longString);
        const outputStream1 = new MockWriteStream();
        
        // Use a small buffer size to ensure multiple chunks are processed
        await nativeEncryptStream(key, iv, inputStream1, outputStream1, 2048);
        const encryptedData = outputStream1.getBuffer();
        
        expect(encryptedData.length).toBeGreaterThan(0);
        expect(encryptedData.toString('utf8')).not.toBe(longString);
        
        // Step 2: Decrypt stream
        const inputStream2 = new MockReadStream(encryptedData);
        const outputStream2 = new MockWriteStream();
        
        await nativeDecryptStream(key, iv, inputStream2, outputStream2, 4096);
        const decryptedString = outputStream2.getString();
        
        expect(decryptedString).toBe(longString);
      });

      it('should successfully round-trip a very long string via streams (1MB)', async () => {
        const longString = 'Large stream test. '.repeat(50000);
        
        const inputStream1 = new MockReadStream(longString);
        const outputStream1 = new MockWriteStream();
        await nativeEncryptStream(key, iv, inputStream1, outputStream1, 16384);
        
        const encryptedData = outputStream1.getBuffer();
        
        const inputStream2 = new MockReadStream(encryptedData);
        const outputStream2 = new MockWriteStream();
        await nativeDecryptStream(key, iv, inputStream2, outputStream2, 16384);
        
        expect(outputStream2.getString()).toBe(longString);
      });
    });
  });

  describe('Browser Crypto Functions', () => {
    let browserKey: string;
    
    beforeAll(async () => {
      browserKey = await browserGenerateKey(password, iv);
    });

    it('should successfully round-trip a long string (100KB)', async () => {
      const longString = 'Browser text data test. '.repeat(4000);
      let encrypted: string = '';
      let decrypted: string = '';

      await browserEncryptText(browserKey, iv, longString, (cipher) => {
        encrypted = cipher;
      });

      expect(encrypted).not.toBe(longString);
      expect(encrypted.length).toBeGreaterThan(0);

      await browserDecryptText(browserKey, iv, encrypted, (plain) => {
        decrypted = plain;
      });

      expect(decrypted).toBe(longString);
    });

    it('should successfully round-trip a very long string (500KB)', async () => {
      const longString = 'Y'.repeat(500 * 1024);
      let encrypted: string = '';
      let decrypted: string = '';

      await browserEncryptText(browserKey, iv, longString, (cipher) => {
        encrypted = cipher;
      });

      await browserDecryptText(browserKey, iv, encrypted, (plain) => {
        decrypted = plain;
      });

      expect(decrypted).toBe(longString);
    });
  });
});

