// Mock for react-native-blob-util since it's not used in current tests
// but referenced in jest config

module.exports = {
  fs: {
    readStream: jest.fn(),
    writeStream: jest.fn(),
  },
  wrap: jest.fn(),
};