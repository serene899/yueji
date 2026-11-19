import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';

// jsdom 的 Blob 不支持 arrayBuffer()；改用 Node 原生实现
(globalThis as unknown as { Blob: unknown }).Blob = NodeBlob;
