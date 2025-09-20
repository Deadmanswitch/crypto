# Deadmanswitch™ Cryptography 

Deadmanswitch™ Cryptography is the framework for secure data handling. It uses randomized salts, one-way fingerprinting, and password-based key derivation to ensure that no sensitive information is stored and the package would only be decrypt-able by the recipient.

## Encryption

1. **Generate a 16-byte Base64 Encoded IVV String**
   - This IVV (Initialization Vector) is used for both encryption and decryption, acting as a salt.
   - It is generated randomly and is unique for each package.

2. **Generate a 32-byte Base64 Encoded Hash for Fingerprinting**
   - This hash is used to create a fingerprint for the package using a password and the IVV.
   - The password is encrypted using PBKDF2 with SHA-256, making this step sensitive as it could be used for decryption.
   - The output from the previous step is encrypted again to generate a non-sensitive fingerprint that cannot be used for decryption.

3. **Generate a 32-byte Base64 Encoded Hash for Data Encryption**
   - This hash is used to encrypt attachments with a password and the IVV.
   - The password is encrypted using PBKDF2 with SHA-256, making this step sensitive as it could be used for decryption.

4. **Encrypt Attachment**
   - The attachment is parsed into a Base64 binary stream with 4096-byte blocks.
   - Each block of data is encrypted using the key and IVV generated in the previous steps.
   - The AES-256-CBC algorithm is used for encryption, and once all blocks are encrypted, a final block is added to ensure the integrity of the encrypted data.

5. **Upload Attachment and Save IVV + Hash (Fingerprint) in the Database**
   - After encryption, the attachment is uploaded.
   - The IVV and the generated hash (fingerprint) are saved in the database for later use.

## Decryption

1. **Download Attachment and Parse the Contents**
   - The encrypted attachment is downloaded and parsed from the Base64 binary stream.

2. **Generate Decryption Key from IVV and Password**
   - The same IVV and password used during encryption are used to generate the decryption key.
   - The password is combined with the IVV using PBKDF2 with SHA-256 to produce the key. This is the same method used during encryption.

3. **Decrypt Attachment**
   - Each block of the parsed data is decrypted using the generated key and the IVV.
   - The AES-256-CBC algorithm is used for decryption, reversing the process used during encryption.
   - Once all blocks are decrypted, they are combined to reconstruct the original attachment.

## Installation

```bash
npm install @deadmanswitch.app/crypto
```

### Peer Dependencies

This package requires different peer dependencies depending on your platform:

#### For React Native Apps

Install the required React Native peer dependencies:

```bash
npm install react-native-quick-crypto react-native-quick-base64
```

After installation, complete the platform setup. For React Native 0.60+, run:

```bash
cd ios && pod install
```

#### For React Web/Next.js Apps

Install the required React peer dependency:

```bash
npm install react
```
## Usage

### React Native (Full Encryption and Decryption)

```typescript
import { 
  nativeGenerateIvv, 
  nativeGenerateKey, 
  nativeGenerateHash, 
  nativeEncryptText, 
  nativeDecryptText 
} from '@deadmanswitch.app/crypto';

// Generate IV and keys for encryption
const encryptData = async () => {
  const password = 'your-secure-password';
  const text = 'Hello, World!';
  
  // Generate random IV
  const ivv = await nativeGenerateIvv();
  
  // Generate encryption key
  const key = await nativeGenerateKey(password, ivv);
  
  // Generate hash for fingerprinting (safe to store)
  const hash = await nativeGenerateHash(password, ivv);
  
  // Encrypt the text
  const encryptedText = nativeEncryptText(key, ivv, text);
  
  console.log('Encrypted:', encryptedText);
  console.log('IV:', ivv);
  console.log('Hash:', hash);
  
  return { encryptedText, ivv, hash };
};
  // Generate the same key used for encryption
  const key = await nativeGenerateKey(password, ivv);
  
  // Decrypt the text
  const decryptedText = nativeDecryptText(key, ivv, encryptedText);
  
  console.log('Decrypted:', decryptedText); // "Hello, World!"
  return decryptedText;
};
```

### React Web/Next.js (Decryption Only)

```typescript
import { 
  browserGenerateKey, 
  browserGenerateHash, 
  browserDecryptText 
} from '@deadmanswitch.app/crypto';
  
  // Generate the same key used for encryption
  const key = await browserGenerateKey(password, ivv);
  
  // Decrypt the text using event handler
  await browserDecryptText(key, ivv, encryptedText, (decryptedText) => {
    console.log('Decrypted:', decryptedText);
  });
};

// Generate hash for verification
const generateHash = async () => {
  const password = 'your-secure-password';
  const ivv = 'iv-from-rn';
  
  const hash = await browserGenerateHash(password, ivv);
  console.log('Hash:', hash);
};
```

The React Native specific dependencies (`react-native`, `react-native-quick-crypto`, `react-native-quick-base64`) are marked as optional and not needed for web applications.
## License

Copyright (c) 2025 Deadmanswitch.com, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
