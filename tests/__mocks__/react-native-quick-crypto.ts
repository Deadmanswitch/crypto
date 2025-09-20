const QuickCrypto = {
  randomBytes: jest.fn(() => true),
  pbkdf2Sync: jest.fn(),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn(),
};

export default QuickCrypto;