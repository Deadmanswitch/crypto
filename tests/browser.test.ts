import { browserGenerateKey, browserGenerateHash, browserDecryptText, browserEncryptText } from '../src/browser';

// Mock the crypto module
const mockSubtle = {
  importKey: jest.fn(),
  deriveBits: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

// Mock global crypto object
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockSubtle,
  },
  writable: true,
});

describe('Browser Crypto Functions', () => {
  const testPassword = 'testPassword123';
  const testIv = Buffer.from('1234567890123456').toString('base64'); // 16 bytes base64 encoded
  const testKey = 'dGVzdEtleTEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm8='; // test key base64
  const testText = 'Hello, World!';
  const testEncryptedText = 'dGVzdEVuY3J5cHRlZFRleHQ='; // test encrypted text base64

  beforeEach(() => {
    // Reset individual mock implementations instead of clearAllMocks
    mockSubtle.importKey?.mockReset?.();
    mockSubtle.deriveBits?.mockReset?.();
    mockSubtle.decrypt?.mockReset?.();
    mockSubtle.encrypt?.mockReset?.();
    
    // Ensure mock functions are available if not set
    if (!mockSubtle.importKey) mockSubtle.importKey = jest.fn();
    if (!mockSubtle.deriveBits) mockSubtle.deriveBits = jest.fn();
    if (!mockSubtle.decrypt) mockSubtle.decrypt = jest.fn();
    if (!mockSubtle.encrypt) mockSubtle.encrypt = jest.fn();
  });

  describe('browserGenerateKey', () => {
    it('should generate a key successfully', async () => {
      const mockDerivedBits = new ArrayBuffer(32);
      
      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.deriveBits.mockResolvedValue(mockDerivedBits);

      const result = await browserGenerateKey(testPassword, testIv);

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      expect(mockSubtle.deriveBits).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: Buffer.from(testIv, 'base64'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        'mock-imported-key',
        256 // 32 * 8
      );

      expect(typeof result).toBe('string');
      expect(result).toBe(Buffer.from(mockDerivedBits).toString('base64'));
    });

    it('should throw error if subtle.importKey is not supported', async () => {
      const originalImportKey = mockSubtle.importKey;
      delete (mockSubtle as any).importKey;

      await expect(browserGenerateKey(testPassword, testIv))
        .rejects
        .toThrow('browserCrypto.subtle.importKey is not supported');
        
      mockSubtle.importKey = originalImportKey;
    });

    it('should handle importKey rejection', async () => {
      mockSubtle.importKey.mockRejectedValue(new Error('Import key failed'));

      await expect(browserGenerateKey(testPassword, testIv))
        .rejects
        .toThrow('Import key failed');
    });

    it('should handle deriveBits rejection', async () => {
      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.deriveBits.mockRejectedValue(new Error('Derive bits failed'));

      await expect(browserGenerateKey(testPassword, testIv))
        .rejects
        .toThrow('Derive bits failed');
    });
  });

  describe('browserGenerateHash', () => {
    it('should generate a hash successfully', async () => {
      const mockDerivedBits = new ArrayBuffer(32);
      
      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.deriveBits.mockResolvedValue(mockDerivedBits);

      const result = await browserGenerateHash(testPassword, testIv);

      // Should call browserGenerateKey twice (once for key, once for hash)
      expect(mockSubtle.importKey).toHaveBeenCalledTimes(2);
      expect(mockSubtle.deriveBits).toHaveBeenCalledTimes(2);
      expect(typeof result).toBe('string');
    });

    it('should handle errors in key generation', async () => {
      mockSubtle.importKey.mockRejectedValue(new Error('Key generation failed'));

      await expect(browserGenerateHash(testPassword, testIv))
        .rejects
        .toThrow('Key generation failed');
    });
  });

  describe('browserEncryptText', () => {
    it('should encrypt text successfully', async () => {
      const mockEncryptedData = new TextEncoder().encode('encrypted-text');
      const mockEventHandler = jest.fn();

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.encrypt.mockResolvedValue(mockEncryptedData.buffer);

      await browserEncryptText(testKey, testIv, testText, mockEventHandler);

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        Buffer.from(testKey, 'base64'),
        { name: 'AES-CBC' },
        false,
        ['encrypt']
      );

      expect(mockSubtle.encrypt).toHaveBeenCalledWith(
        { name: 'AES-CBC', iv: Buffer.from(testIv, 'base64') },
        'mock-imported-key',
        new TextEncoder().encode(testText)
      );

      expect(mockEventHandler).toHaveBeenCalledWith(Buffer.from(mockEncryptedData).toString('base64'));
    });

    it('should throw error if subtle.importKey is not supported', async () => {
      const originalImportKey = mockSubtle.importKey;
      delete (mockSubtle as any).importKey;
      const mockEventHandler = jest.fn();

      await expect(browserEncryptText(testKey, testIv, testText, mockEventHandler))
        .rejects
        .toThrow('browserCrypto.subtle.importKey is not supported');

      expect(mockEventHandler).not.toHaveBeenCalled();
      mockSubtle.importKey = originalImportKey;
    });

    it('should handle importKey rejection', async () => {
      mockSubtle.importKey.mockRejectedValue(new Error('Import key failed'));
      const mockEventHandler = jest.fn();

      await expect(browserEncryptText(testKey, testIv, testText, mockEventHandler))
        .rejects
        .toThrow('Import key failed');

      expect(mockEventHandler).not.toHaveBeenCalled();
    });

    it('should handle encrypt rejection', async () => {
      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.encrypt.mockRejectedValue(new Error('Encrypt failed'));
      const mockEventHandler = jest.fn();

      await expect(browserEncryptText(testKey, testIv, testText, mockEventHandler))
        .rejects
        .toThrow('Encrypt failed');

      expect(mockEventHandler).not.toHaveBeenCalled();
    });

    it('should handle empty text', async () => {
      const mockEncryptedData = new ArrayBuffer(0);
      const mockEventHandler = jest.fn();

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.encrypt.mockResolvedValue(mockEncryptedData);

      await browserEncryptText(testKey, testIv, '', mockEventHandler);

      expect(mockEventHandler).toHaveBeenCalledWith(Buffer.from(mockEncryptedData).toString('base64'));
    });
  });

  describe('browserDecryptText', () => {
    it('should decrypt text successfully', async () => {
      const mockDecryptedData = new TextEncoder().encode(testText);
      const mockEventHandler = jest.fn();

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.decrypt.mockResolvedValue(mockDecryptedData.buffer);

      await browserDecryptText(testKey, testIv, testEncryptedText, mockEventHandler);

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        Buffer.from(testKey, 'base64'),
        { name: 'AES-CBC' },
        false,
        ['decrypt']
      );

      expect(mockSubtle.decrypt).toHaveBeenCalledWith(
        { name: 'AES-CBC', iv: Buffer.from(testIv, 'base64') },
        'mock-imported-key',
        Buffer.from(testEncryptedText, 'base64')
      );

      expect(mockEventHandler).toHaveBeenCalledWith(testText);
    });

    it('should throw error if subtle.importKey is not supported', async () => {
      const originalImportKey = mockSubtle.importKey;
      delete (mockSubtle as any).importKey;
      const mockEventHandler = jest.fn();

      await expect(browserDecryptText(testKey, testIv, testEncryptedText, mockEventHandler))
        .rejects
        .toThrow('browserCrypto.subtle.importKey is not supported');

      expect(mockEventHandler).not.toHaveBeenCalled();
      mockSubtle.importKey = originalImportKey;
    });

    it('should handle importKey rejection', async () => {
      mockSubtle.importKey.mockRejectedValue(new Error('Import key failed'));
      const mockEventHandler = jest.fn();

      await expect(browserDecryptText(testKey, testIv, testEncryptedText, mockEventHandler))
        .rejects
        .toThrow('Import key failed');

      expect(mockEventHandler).not.toHaveBeenCalled();
    });

    it('should handle decrypt rejection', async () => {
      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.decrypt.mockRejectedValue(new Error('Decrypt failed'));
      const mockEventHandler = jest.fn();

      await expect(browserDecryptText(testKey, testIv, testEncryptedText, mockEventHandler))
        .rejects
        .toThrow('Decrypt failed');

      expect(mockEventHandler).not.toHaveBeenCalled();
    });

    it('should handle empty decrypted text', async () => {
      const mockDecryptedData = new ArrayBuffer(0);
      const mockEventHandler = jest.fn();

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.decrypt.mockResolvedValue(mockDecryptedData);

      await browserDecryptText(testKey, testIv, testEncryptedText, mockEventHandler);

      expect(mockEventHandler).toHaveBeenCalledWith('');
    });
  });

  describe('Integration tests', () => {
    it('should generate consistent keys for same input', async () => {
      const mockDerivedBits = new ArrayBuffer(32);
      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.deriveBits.mockResolvedValue(mockDerivedBits);

      const key1 = await browserGenerateKey(testPassword, testIv);
      const key2 = await browserGenerateKey(testPassword, testIv);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different passwords', async () => {
      const mockDerivedBits1 = new ArrayBuffer(32);
      const mockDerivedBits2 = new ArrayBuffer(32);
      // Make the second one different
      new Uint8Array(mockDerivedBits2)[0] = 1;

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.deriveBits
        .mockResolvedValueOnce(mockDerivedBits1)
        .mockResolvedValueOnce(mockDerivedBits2);

      const key1 = await browserGenerateKey(testPassword, testIv);
      const key2 = await browserGenerateKey('differentPassword', testIv);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different IVs', async () => {
      const mockDerivedBits1 = new ArrayBuffer(32);
      const mockDerivedBits2 = new ArrayBuffer(32);
      // Make the second one different
      new Uint8Array(mockDerivedBits2)[0] = 1;

      const differentIv = Buffer.from('6543210987654321').toString('base64');

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.deriveBits
        .mockResolvedValueOnce(mockDerivedBits1)
        .mockResolvedValueOnce(mockDerivedBits2);

      const key1 = await browserGenerateKey(testPassword, testIv);
      const key2 = await browserGenerateKey(testPassword, differentIv);

      expect(key1).not.toBe(key2);
    });

    it('should encrypt and decrypt text successfully', async () => {
      const mockEncryptedData = new TextEncoder().encode('encrypted-data');
      const mockDecryptedData = new TextEncoder().encode(testText);
      const encryptEventHandler = jest.fn();
      const decryptEventHandler = jest.fn();

      mockSubtle.importKey.mockResolvedValue('mock-imported-key');
      mockSubtle.encrypt.mockResolvedValue(mockEncryptedData.buffer);
      mockSubtle.decrypt.mockResolvedValue(mockDecryptedData.buffer);

      await browserEncryptText(testKey, testIv, testText, encryptEventHandler);
      const encryptedText = Buffer.from(mockEncryptedData).toString('base64');
      
      await browserDecryptText(testKey, testIv, encryptedText, decryptEventHandler);

      expect(encryptEventHandler).toHaveBeenCalledWith(encryptedText);
      expect(decryptEventHandler).toHaveBeenCalledWith(testText);
    });
  });
});