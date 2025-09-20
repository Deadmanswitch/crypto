// Test setup file for Jest
// This file is run once before all test suites

// Mock TextEncoder and TextDecoder for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Buffer if not available
if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}