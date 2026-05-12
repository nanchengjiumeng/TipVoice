export class ChatApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "ChatApiError";
    this.code = code;
  }
}

export class ChatNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatNetworkError";
  }
}
