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

import type { Encoding } from "react-native-quick-crypto/lib/typescript/src/Utils";

export interface ReactNativeBlobUtilReadStream {
  path: string;
  encoding: Encoding;
  bufferSize?: number;
  closed: boolean;
  tick: number;
  open(): void;
  onData(fn: (chunk: string | number[]) => void): void;
  onError(fn: (err: any) => void): void;
  onEnd(fn: () => void): void;
}

export interface ReactNativeBlobUtilWriteStream {
  id: string;
  encoding: string;
  append: boolean;
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

export type NativeGenerateKey = (password: string, ivv: string) => Promise<string>;
export type NativeGenerateHash = (password: string, ivv: string) => Promise<string>;
export type NativeEncryptStream = (key: string, ivv: string, inputStream: ReactNativeBlobUtilReadStream, outputStream: ReactNativeBlobUtilWriteStream, bufferSize?: number) => Promise<void>;
export type NativeDecryptStream = (key: string, ivv: string, inputStream: ReactNativeBlobUtilReadStream, outputStream: ReactNativeBlobUtilWriteStream, bufferSize?: number) => Promise<void>;
export type NativeEncryptText = (key: string, ivv: string, text: string, event: (cipher: string) => void) => Promise<void>;

export * from './native';