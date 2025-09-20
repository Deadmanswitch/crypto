const mockSubtle = {
  importKey: jest.fn(),
  deriveBits: jest.fn(),
  decrypt: jest.fn(),
};

module.exports = {
  subtle: mockSubtle,
};