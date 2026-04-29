import { Button } from "@heroui/react";

type Page = "profiles" | "cache";

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const items: { key: Page; label: string; icon: string }[] = [
  { key: "profiles", label: "语音方案", icon: "🎙" },
  { key: "cache", label: "缓存管理", icon: "📁" },
];

export function Sidebar({ activePage, onNavigate }: Props) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-3 gap-1">
      <div className="px-3 py-3 mb-2">
        <h1 className="text-lg font-bold text-gray-800">Tip Voice</h1>
        <p className="text-xs text-gray-400 mt-0.5">语音合成管理</p>
      </div>
      {items.map((item) => (
        <Button
          key={item.key}
          variant={activePage === item.key ? "primary" : "ghost"}
          fullWidth
          onPress={() => onNavigate(item.key)}
          className="justify-start gap-2"
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </Button>
      ))}
    </aside>
  );
}
