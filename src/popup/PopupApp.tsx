import { Button } from "@heroui/react";

export function PopupApp() {
  const openManager = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") });
  };

  return (
    <div className="w-80 p-4 space-y-3">
      <header className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <img src="icons/icon-128.png" width="24" height="24" />
        <h1 className="text-base font-bold text-gray-800 flex-1">Tip Voice</h1>
      </header>

      <div className="text-sm text-gray-600 space-y-2">
        <p>划词朗读 · 智能翻译</p>
        <p className="text-xs text-gray-400">
          选中文本后点击小喇叭朗读，点击翻译按钮查看多语言翻译结果
        </p>
      </div>

      <Button variant="primary" size="sm" fullWidth onPress={openManager}>
        管理方案
      </Button>
    </div>
  );
}
