import { 
  nativeGenerateKey, 
  nativeGenerateHash, 
  nativeEncryptStream, 
  nativeDecryptStream, 
  nativeEncryptText,
  nativeDecryptText,
  nativeGenerateIvv
} from '../src/native';
import { ReactNativeBlobUtilReadStream, ReactNativeBlobUtilWriteStream } from '../src/types';

// Mock react-native-quick-crypto
jest.mock('react-native-quick-crypto');

describe('Native Crypto Functions', () => {
  const testPassword = 'testPassword123';
  const testIv = Buffer.from('1234567890123456').toString('base64'); // 16 bytes base64 encoded
  const testKey = 'dGVzdEtleTEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm8='; // test key base64
  const testText = 'Hello, World!';

  // Get the mocked QuickCrypto object
  const mockQuickCrypto = jest.mocked(require('react-native-quick-crypto').default);

  beforeEach(() => {
    // Reinitialize all mocks to ensure they're available and truthy
    mockQuickCrypto.randomBytes = jest.fn(() => true);
    mockQuickCrypto.pbkdf2Sync = jest.fn();
    mockQuickCrypto.createCipheriv = jest.fn();
    mockQuickCrypto.createDecipheriv = jest.fn();
  });

  describe('nativeGenerateIvv', () => {
    it('should generate a random IV successfully', async () => {
      const mockIv = Buffer.from('1234567890123456'); // 16 bytes
      mockQuickCrypto.randomBytes.mockReturnValue(mockIv);

      const result = await nativeGenerateIvv();

      expect(mockQuickCrypto.randomBytes).toHaveBeenCalledWith(16);
      expect(result).toBe(mockIv.toString('base64'));
    });

  });

  describe('nativeGenerateKey', () => {
    it('should generate a key successfully', async () => {
      const mockKey = Buffer.from('test-key-32-bytes-long-for-aes256', 'utf8');
      
      
      mockQuickCrypto.pbkdf2Sync.mockReturnValue(mockKey);

      const result = await nativeGenerateKey(testPassword, testIv);

      expect(mockQuickCrypto.pbkdf2Sync).toHaveBeenCalledWith(
        testPassword,
        Buffer.from(testIv, 'base64'),
        100000, // defaultIterations
        32, // bytesize
        'sha256'
      );

      expect(result).toBe(mockKey.toString('base64'));
    });

    it('should handle pbkdf2Sync errors', async () => {
      mockQuickCrypto.pbkdf2Sync.mockImplementation(() => {
        throw new Error('PBKDF2 failed');
      });

      await expect(nativeGenerateKey(testPassword, testIv))
        .rejects
        .toThrow('PBKDF2 failed');
    });
  });

  describe('nativeGenerateHash', () => {
    it('should generate a hash successfully', async () => {
      const mockKey1 = Buffer.from('test-key-32-bytes-long-for-aes256', 'utf8');
      const mockKey2 = Buffer.from('hash-key-32-bytes-long-for-aes256', 'utf8');
      
      mockQuickCrypto.pbkdf2Sync
        .mockReturnValueOnce(mockKey1)
        .mockReturnValueOnce(mockKey2);

      const result = await nativeGenerateHash(testPassword, testIv);

      expect(mockQuickCrypto.pbkdf2Sync).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockKey2.toString('base64'));
    });

    it('should handle errors in key generation', async () => {
      mockQuickCrypto.pbkdf2Sync.mockImplementation(() => {
        throw new Error('Key generation failed');
      });

      await expect(nativeGenerateHash(testPassword, testIv))
        .rejects
        .toThrow('Key generation failed');
    });
  });

  describe('nativeEncryptStream', () => {
    let mockInputStream: jest.Mocked<ReactNativeBlobUtilReadStream>;
    let mockOutputStream: jest.Mocked<ReactNativeBlobUtilWriteStream>;
    let mockCipher: any;

    beforeEach(() => {
      mockInputStream = {
        path: 'test-path',
        encoding: 'utf8' as any,
        bufferSize: 1024,
        closed: false,
        tick: 0,
        open: jest.fn(),
        onData: jest.fn(),
        onError: jest.fn(),
        onEnd: jest.fn(),
      };

      mockOutputStream = {
        id: 'test-output',
        encoding: 'base64',
        append: false,
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockCipher = {
        update: jest.fn().mockReturnValue(Buffer.from('encrypted-chunk')),
        final: jest.fn().mockReturnValue(Buffer.from('final-chunk')),
      };

      mockQuickCrypto.createCipheriv.mockReturnValue(mockCipher);
    });

    it('should encrypt stream successfully', async () => {
      const testChunk = 'test-data-chunk';
      
      // Simulate stream events
      mockInputStream.onData.mockImplementation((callback) => {
        setTimeout(() => callback(testChunk), 10);
      });
      
      mockInputStream.onEnd.mockImplementation((callback) => {
        setTimeout(() => callback(), 20);
      });

      const promise = nativeEncryptStream(testKey, testIv, mockInputStream, mockOutputStream);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await promise;

      expect(mockQuickCrypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(testKey, 'base64'),
        Buffer.from(testIv, 'base64')
      );

      expect(mockInputStream.open).toHaveBeenCalled();
      expect(mockInputStream.encoding).toBe('base64');
      expect(mockOutputStream.encoding).toBe('utf8');
    });

    it('should set custom buffer size', async () => {
      const customBufferSize = 2048;
      
      mockInputStream.onData.mockImplementation((callback) => {
        setTimeout(() => callback('test'), 10);
      });
      
      mockInputStream.onEnd.mockImplementation((callback) => {
        setTimeout(() => callback(), 20);
      });

      const promise = nativeEncryptStream(testKey, testIv, mockInputStream, mockOutputStream, customBufferSize);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      await promise;

      expect(mockInputStream.bufferSize).toBe(customBufferSize);
    });


    it('should handle stream errors', async () => {
      const testError = new Error('Stream error');
      
      // Mock console.error to suppress error output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockInputStream.onError.mockImplementation((callback) => {
        setTimeout(() => callback(testError), 10);
      });

      await expect(nativeEncryptStream(testKey, testIv, mockInputStream, mockOutputStream))
        .rejects
        .toThrow('Stream error');
        
      consoleSpy.mockRestore();
    });
  });

  describe('nativeDecryptStream', () => {
    let mockInputStream: jest.Mocked<ReactNativeBlobUtilReadStream>;
    let mockOutputStream: jest.Mocked<ReactNativeBlobUtilWriteStream>;
    let mockDecipher: any;

    beforeEach(() => {
      mockInputStream = {
        path: 'test-path',
        encoding: 'utf8' as any,
        bufferSize: 1024,
        closed: false,
        tick: 0,
        open: jest.fn(),
        onData: jest.fn(),
        onError: jest.fn(),
        onEnd: jest.fn(),
      };

      mockOutputStream = {
        id: 'test-output',
        encoding: 'utf8',
        append: false,
        write: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockDecipher = {
        update: jest.fn().mockReturnValue(Buffer.from('decrypted-chunk')),
        final: jest.fn().mockReturnValue(Buffer.from('final-chunk')),
      };

      mockQuickCrypto.createDecipheriv.mockReturnValue(mockDecipher);
    });

    it('should decrypt stream successfully', async () => {
      const testChunk = 'encrypted-data-chunk';
      
      mockInputStream.onData.mockImplementation((callback) => {
        setTimeout(() => callback(testChunk), 10);
      });
      
      mockInputStream.onEnd.mockImplementation((callback) => {
        setTimeout(() => callback(), 20);
      });

      const promise = nativeDecryptStream(testKey, testIv, mockInputStream, mockOutputStream);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      await promise;

      expect(mockQuickCrypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(testKey, 'base64'),
        Buffer.from(testIv, 'base64')
      );

      expect(mockInputStream.open).toHaveBeenCalled();
      expect(mockInputStream.encoding).toBe('utf8');
      expect(mockOutputStream.encoding).toBe('base64');
    });

  });

  describe('nativeEncryptText', () => {
    let mockCipher: any;

    beforeEach(() => {
      mockCipher = {
        update: jest.fn().mockReturnValue(Buffer.from('encrypted-part1')),
        final: jest.fn().mockReturnValue(Buffer.from('encrypted-part2')),
      };

      mockQuickCrypto.createCipheriv.mockReturnValue(mockCipher);
    });

    it('should encrypt text successfully', async () => {
      const result = await nativeEncryptText(testKey, testIv, testText);

      expect(mockQuickCrypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(testKey, 'base64'),
        Buffer.from(testIv, 'base64')
      );

      expect(mockCipher.update).toHaveBeenCalledWith(testText, 'utf8', 'base64');
      expect(mockCipher.final).toHaveBeenCalledWith('base64');

      expect(result).toBe('encrypted-part1encrypted-part2');
    });


    it('should handle cipher errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockCipher.update.mockImplementation(() => {
        throw new Error('Cipher error');
      });

      expect(() => nativeEncryptText(testKey, testIv, testText))
        .toThrow('Cipher error');
      
      consoleSpy.mockRestore();
    });

    it('should handle empty text', async () => {
      mockCipher.update.mockReturnValue(Buffer.from(''));
      mockCipher.final.mockReturnValue(Buffer.from(''));

      const result = nativeEncryptText(testKey, testIv, '');

      expect(result).toBe('');
    });
  });

  describe('nativeDecryptText', () => {
    let mockDecipher: any;

    beforeEach(() => {
      mockDecipher = {
        update: jest.fn().mockReturnValue(Buffer.from('decrypted-part1')),
        final: jest.fn().mockReturnValue(Buffer.from('decrypted-part2')),
      };

      mockQuickCrypto.createDecipheriv.mockReturnValue(mockDecipher);
    });

    it('should decrypt text successfully', async () => {
      const encryptedText = 'ZW5jcnlwdGVkVGV4dA=='; // base64 encoded

      const result = nativeDecryptText(testKey, testIv, encryptedText);

      expect(mockQuickCrypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-cbc',
        Buffer.from(testKey, 'base64'),
        Buffer.from(testIv, 'base64')
      );

      expect(mockDecipher.update).toHaveBeenCalledWith(encryptedText, 'base64', 'utf8');
      expect(mockDecipher.final).toHaveBeenCalledWith('utf8');

      expect(result).toBe('decrypted-part1decrypted-part2');
    });


    it('should handle decipher errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockDecipher.update.mockImplementation(() => {
        throw new Error('Decipher error');
      });

      expect(() => nativeDecryptText(testKey, testIv, 'encrypted'))
        .toThrow('Decipher error');
      
      consoleSpy.mockRestore();
    });

    it('should handle empty decrypted text', async () => {
      mockDecipher.update.mockReturnValue(Buffer.from(''));
      mockDecipher.final.mockReturnValue(Buffer.from(''));

      const result = nativeDecryptText(testKey, testIv, 'encrypted');

      expect(result).toBe('');
    });
  });

  describe('Integration tests', () => {
    it('should generate consistent keys for same input', async () => {
      const mockKey = Buffer.from('consistent-key-for-same-input-32b', 'utf8');
      mockQuickCrypto.pbkdf2Sync.mockReturnValue(mockKey);

      const key1 = await nativeGenerateKey(testPassword, testIv);
      const key2 = await nativeGenerateKey(testPassword, testIv);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different passwords', async () => {
      const mockKey1 = Buffer.from('key-for-password1-different-from-2', 'utf8');
      const mockKey2 = Buffer.from('key-for-password2-different-from-1', 'utf8');
      
      mockQuickCrypto.pbkdf2Sync
        .mockReturnValueOnce(mockKey1)
        .mockReturnValueOnce(mockKey2);

      const key1 = await nativeGenerateKey(testPassword, testIv);
      const key2 = await nativeGenerateKey('differentPassword', testIv);

      expect(key1).not.toBe(key2);
    });

    it('should generate different IVs each time', async () => {
      const mockIv1 = Buffer.from('1234567890123456');
      const mockIv2 = Buffer.from('6543210987654321');
      
      mockQuickCrypto.randomBytes
        .mockReturnValueOnce(mockIv1)
        .mockReturnValueOnce(mockIv2);

      const iv1 = await nativeGenerateIvv();
      const iv2 = await nativeGenerateIvv();

      expect(iv1).not.toBe(iv2);
      expect(iv1).toBe(mockIv1.toString('base64'));
      expect(iv2).toBe(mockIv2.toString('base64'));
    });
  });
});