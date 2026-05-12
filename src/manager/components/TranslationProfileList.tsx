import type { TranslationProfile } from "../../shared/types.ts";
import { TRANSLATION_PROVIDER_LABELS } from "../../shared/constants.ts";
import { Button, Card, Chip } from "@heroui/react";

interface Props {
  profiles: TranslationProfile[];
  activeProfileIds: string[];
  editingProfileId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (profile: TranslationProfile) => void;
  onDelete: (id: string) => void;
}

function isDefaultProfile(id: string): boolean {
  return id.startsWith("default-");
}

export function TranslationProfileList({
  profiles,
  activeProfileIds,
  editingProfileId,
  onCreate,
  onSelect,
  onToggleActive,
  onDuplicate,
  onDelete,
}: Props) {
  const activeIdSet = new Set(activeProfileIds);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-gray-600">翻译方案列表</h2>
        <Button variant="primary" size="sm" onPress={onCreate}>
          + 新建
        </Button>
      </div>
      {profiles.map((p) => {
        const isActive = activeIdSet.has(p.id);

        return (
          <Card
            key={p.id}
            className={`group cursor-pointer ${
              editingProfileId === p.id
                ? "border-primary-300 bg-primary-50"
                : isActive
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Card.Content className="p-2" onClick={() => onSelect(p.id)}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                  <div className="text-xs text-gray-400">
                    {TRANSLATION_PROVIDER_LABELS[p.provider]}
                  </div>
                </div>
                {isActive && (
                  <Chip size="sm" color="success" variant="soft" className="ml-1.5">
                    已勾选
                  </Chip>
                )}
              </div>
              <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => onToggleActive(p.id)}
                  className="text-[11px]"
                >
                  {isActive ? "取消勾选" : "勾选"}
                </Button>
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
        );
      })}
    </div>
  );
}
