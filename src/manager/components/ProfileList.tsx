import type { VoiceProfile } from "../../shared/types.ts";
import { PROVIDER_LABELS } from "../../shared/constants.ts";
import { Button, Card, Chip } from "@heroui/react";

interface Props {
  profiles: VoiceProfile[];
  activeProfileId: string;
  editingProfileId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onSetActive: (id: string) => void;
  onDuplicate: (profile: VoiceProfile) => void;
  onDelete: (id: string) => void;
}

function isDefaultProfile(id: string): boolean {
  return id.startsWith("default-");
}

export function ProfileList({
  profiles,
  activeProfileId,
  editingProfileId,
  onCreate,
  onSelect,
  onSetActive,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-gray-600">方案列表</h2>
        <Button variant="primary" size="sm" onPress={onCreate}>
          + 新建
        </Button>
      </div>
      {profiles.map((p) => (
        <Card
          key={p.id}
          className={`group cursor-pointer ${
            editingProfileId === p.id
              ? "border-primary-300 bg-primary-50"
              : p.id === activeProfileId
                ? "border-green-300 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <Card.Content className="p-2" onClick={() => onSelect(p.id)}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-400">{PROVIDER_LABELS[p.provider]}</div>
              </div>
              {p.id === activeProfileId && (
                <Chip size="sm" color="success" variant="soft" className="ml-1.5">
                  使用中
                </Chip>
              )}
            </div>
            <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {p.id !== activeProfileId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => onSetActive(p.id)}
                  className="text-[11px]"
                >
                  设为使用
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onPress={() => onDuplicate(p)}
                className="text-[11px]"
              >
                复制
              </Button>
              {profiles.length > 1 && !isDefaultProfile(p.id) && (
                <Button
                  variant="danger"
                  size="sm"
                  onPress={() => onDelete(p.id)}
                  className="text-[11px]"
                >
                  删除
                </Button>
              )}
            </div>
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
