import { describe, expect, it } from "vite-plus/test";
import { normalizeMarkdown } from "../src/shared/markdown.ts";

describe("normalizeMarkdown", () => {
  it("normalizes single-line pipe tables", () => {
    const input =
      "| 词性 | 释义 | 例句 | |------|------|------| | 名词复数 | 数百万（表示数量） | The project cost millions of dollars. | | 名词复数 | 大量，无数（夸张用法） | She has millions of ideas every day. |";

    expect(normalizeMarkdown(input)).toBe(
      [
        "| 词性 | 释义 | 例句 |",
        "| ------ | ------ | ------ |",
        "| 名词复数 | 数百万（表示数量） | The project cost millions of dollars. |",
        "| 名词复数 | 大量，无数（夸张用法） | She has millions of ideas every day. |",
      ].join("\n"),
    );
  });
});
