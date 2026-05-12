# Tip Voice Chrome Extension 开发指南

## 问题说明

Chrome 扩展有严格的安全限制，popup 页面无法访问外部 URL（包括 `localhost`）。这导致开发模式下的 Vite dev server 无法直接用于 popup。

## 解决方案

### 方案 1：构建后加载（推荐用于测试）

```bash
# 构建
pnpm build

# 或者使用快捷脚本
./dev.sh
```

然后在 Chrome 中：

1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `dist` 目录

### 方案 2：开发模式（用于内容脚本和后台脚本）

对于 content script 和 background script，可以使用开发模式：

```bash
pnpm dev
```

**限制**：

- ✅ content script 支持热重载（需要 Chromium 110+）
- ✅ background script 支持热重载
- ❌ popup 不支持热重载（需要手动重新构建）
- ❌ manager 页面不支持热重载

## 最佳实践

### 开发流程

1. **内容脚本开发**：使用 `pnpm dev`，修改会自动重载
2. **Popup/Manager 开发**：使用 `pnpm build` + 重新加载扩展
3. **后台脚本开发**：使用 `pnpm dev`，修改会自动重载

### 测试流程

```bash
# 1. 构建扩展
pnpm build

# 2. 在 Chrome 中重新加载扩展（chrome://extensions/）

# 3. 测试功能
```

## 已添加的配置

### manifest.json

```json
{
  "host_permissions": [
    "http://localhost:5173/*" // 允许开发模式访问
  ],
  "web_accessible_resources": [
    {
      "resources": ["*"],
      "matches": ["<all_urls>"],
      "use_dynamic_url": true
    }
  ]
}
```

### vite.config.ts

```typescript
{
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
      clientPort: 5173
    }
  }
}
```

## 开发脚本

使用 `./dev.sh` 快速构建和获取提示。

## 为什么 popup 在开发模式下是空白？

1. **Chrome 安全限制**：扩展 popup 无法访问外部 URL
2. **Vite dev server**：开发模式下生成的 HTML 包含 `http://localhost:5173` 的引用
3. **解决方案**：构建后的 popup.html 使用相对路径，可以正常加载

## 热重载支持表

| 组件              | 热重载支持 | 备注                  |
| ----------------- | ---------- | --------------------- |
| Content Script    | ✅         | Chromium 110+         |
| Background Script | ✅         | Manifest V3           |
| Popup             | ❌         | 需手动重新构建        |
| Manager           | ❌         | 需手动重新构建        |
| CSS in Shadow DOM | ✅         | 需配置 addStyleTarget |

## 常见问题

### Q: 为什么重启 `pnpm dev` 后 popup 空白？

A: 因为 popup.html 在开发模式下包含 localhost URL，Chrome 扩展无法访问。解决：使用 `pnpm build` 并加载 dist 目录。

### Q: 如何快速测试 popup？

A: 运行 `pnpm build` 后在 Chrome 扩展页面点击刷新按钮。

### Q: Content script 能热重载吗？

A: 可以，需要 Chromium 110+，运行 `pnpm dev` 后修改会自动生效。

## 技术细节

详见 `vite-plugin-web-extension` 文档：
https://github.com/samrum/vite-plugin-web-extension
