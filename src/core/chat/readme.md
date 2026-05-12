# Chat 模块

通用 LLM Chat 对话模块，统一对接所有 OpenAI 兼容的 Chat Completion API，为上层业务（翻译、摘要、润色等）提供一致的调用接口。

## 设计目标

- **Provider 无关**：上层代码只依赖 `ChatProvider` 接口，不关心底层是 MiniMax、SiliconFlow 还是任意 OpenAI 兼容服务
- **流式优先**：原生支持 SSE 流式输出，同时保留一次性调用能力
- **可复用**：可在浏览器插件、Node.js、Web 三种环境运行（不依赖 Chrome API）
- **易扩展**：新增 Provider 只需实现一个接口 + 注册到工厂，无需改动业务代码

## 目录结构

```
src/core/chat/
├── readme.md                 # 本文件
├── types.ts                  # Chat 模块专用类型定义
├── errors.ts                 # ChatApiError / ChatNetworkError
├── provider.ts               # ChatProvider 接口定义
├── openai-compatible.ts      # OpenAI 兼容流式/非流式核心实现
├── providers/
│   ├── minimax.ts            # MiniMax Chat Provider
│   ├── siliconflow.ts        # SiliconFlow Chat Provider
│   └── openai.ts             # 通用 OpenAI Provider（可直接对接 OpenAI / Azure / 任意兼容端点）
├── factory.ts                # getChatProvider(providerId) 工厂函数
├── index.ts                  # 模块统一导出
└── __tests__/
    └── chat.test.ts          # 单元测试
```

## 核心接口

### ChatProvider

```ts
interface ChatProvider {
  readonly id: string;

  chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse>;

  chatStream(
    request: ChatRequest,
    onChunk: (chunk: ChatStreamChunk, accumulated: string) => void,
    signal?: AbortSignal,
  ): Promise<string>;
}
```

### ChatRequest

```ts
interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  extra?: Record<string, unknown>; // Provider 特有参数，如 enable_thinking
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### ChatResponse

```ts
interface ChatResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}
```

### ChatStreamChunk

```ts
interface ChatStreamChunk {
  content: string;
  done: boolean;
}
```

## 错误处理

```ts
class ChatApiError extends Error {
  code: number;
  constructor(code: number, message: string);
}

class ChatNetworkError extends Error {
  constructor(message: string);
}
```

| 错误场景      | 抛出类型           | 典型 code  |
| ------------- | ------------------ | ---------- |
| API Key 无效  | `ChatApiError`     | `1004`     |
| 模型不可用    | `ChatApiError`     | API 原始码 |
| 网络超时/断连 | `ChatNetworkError` | —          |
| 流式响应超时  | `ChatNetworkError` | —          |

## Provider 注册与使用

### 注册新 Provider

```ts
// providers/my-provider.ts
import type { ChatProvider } from "../provider.ts";
import type { ChatProviderConfig, ChatRequest, ChatResponse, ChatStreamChunk } from "../types.ts";
import { chatOpenAICompatible, chatOpenAICompatibleStream } from "../openai-compatible.ts";

export class MyProvider implements ChatProvider {
  readonly id = "my-provider";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ChatProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.example.com/v1/chat/completions";
  }

  async chat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    return chatOpenAICompatible(this.baseUrl, this.apiKey, request, this.id, signal);
  }

  async chatStream(
    request: ChatRequest,
    onChunk: (chunk: ChatStreamChunk, accumulated: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    return chatOpenAICompatibleStream(this.baseUrl, this.apiKey, request, this.id, onChunk, signal);
  }
}
```

```ts
// factory.ts — 注册
import { MyProvider } from "./providers/my-provider.ts";

registry.set("my-provider" as ChatProviderId, (config) => new MyProvider(config));
```

### 调用示例

```ts
import { getChatProvider } from "./factory.ts";

const provider = getChatProvider("minimax", { apiKey: "sk-xxx" });

const result = await provider.chatStream(
  {
    model: "MiniMax-M2.7-highspeed",
    messages: [
      { role: "system", content: "你是一个翻译助手" },
      { role: "user", content: "翻译：hello" },
    ],
  },
  (chunk, accumulated) => {
    console.log("收到片段:", chunk.content);
  },
);
```

## 已支持的 Provider

| Provider    | 端点                                     | 认证方式       | 特有参数          |
| ----------- | ---------------------------------------- | -------------- | ----------------- |
| MiniMax     | `api.minimaxi.com/v1/chat/completions`   | `Bearer` Token | —                 |
| SiliconFlow | `api.siliconflow.cn/v1/chat/completions` | `Bearer` Token | `enable_thinking` |
| OpenAI      | `api.openai.com/v1/chat/completions`     | `Bearer` Token | —                 |

## 兼容性

| 环境                                      | 支持 | 备注                                     |
| ----------------------------------------- | ---- | ---------------------------------------- |
| Chrome Extension (Background / Offscreen) | ✅   | 使用原生 `fetch`                         |
| Chrome Extension (Content Script)         | ⚠️   | 需通过 Background 中转消息               |
| Node.js                                   | ✅   | 需 Node 18+（原生 fetch）或提供 polyfill |
| Web (Browser)                             | ✅   | 使用原生 `fetch`                         |
