# Chat API

统一的聊天 API 接口，支持多个 AI 服务提供商。

## 导入

```ts
import type {
  ChatProvider,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  ChatProviderConfig,
} from "@/core/chat";

import { MINIMAX_CHAT_MODELS, SILICONFLOW_CHAT_MODELS } from "@/core/chat";
```

## 类型定义

### ChatProvider

聊天服务提供者接口：

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

请求参数：

```ts
interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  extra?: Record<string, unknown>;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### ChatResponse

响应结果：

```ts
interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}
```

### ChatStreamChunk

流式响应块：

```ts
interface ChatStreamChunk {
  content: string;
  done: boolean;
}
```

### ChatProviderConfig

提供者配置：

```ts
interface ChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
}
```

## 使用方式

### 非流式对话

```ts
import { MinimaxChatProvider } from "@/core/chat/providers/minimax";
import type { ChatRequest } from "@/core/chat";

const provider = new MinimaxChatProvider({
  apiKey: "your-api-key",
});

const request: ChatRequest = {
  model: "MiniMax-M2.7",
  messages: [
    { role: "system", content: "你是一个有用的助手。" },
    { role: "user", content: "你好" },
  ],
};

const response = await provider.chat(request);
console.log(response.content);
```

### 流式对话

```ts
const result = await provider.chatStream(request, (chunk, accumulated) => {
  console.log("chunk:", chunk.content);
  console.log("accumulated:", accumulated);
});

console.log("final result:", result);
```

### 取消请求

```ts
const signal = AbortSignal.timeout(30_000);
const response = await provider.chat(request, signal);
```

## 可用模型

### Minimax

```ts
import { MINIMAX_CHAT_MODELS } from "@/core/chat";

MINIMAX_CHAT_MODELS.forEach((model) => {
  console.log(model.label, model.value);
});
```

可用模型：

- `MiniMax-M2.7` (推荐)
- `MiniMax-M2.7-highspeed`
- `MiniMax-M2.5`
- `MiniMax-M2.1`

### SiliconFlow

```ts
import { SILICONFLOW_CHAT_MODELS } from "@/core/chat";

SILICONFLOW_CHAT_MODELS.forEach((model) => {
  console.log(model.label, model.value);
});
```

可用模型：

- `deepseek-ai/DeepSeek-V4-Flash` (推荐)
- `Pro/zai-org/GLM-5`
- `Qwen/Qwen3-32B`
- 更多模型见 `SILICONFLOW_CHAT_MODELS`

## 提供者实现

需要直接导入具体的提供者类：

```ts
import { MinimaxChatProvider } from "@/core/chat/providers/minimax";
import { SiliconFlowChatProvider } from "@/core/chat/providers/siliconflow";
import { OpenAIChatProvider } from "@/core/chat/providers/openai";
```
