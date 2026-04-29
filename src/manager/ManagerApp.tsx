import { useState, useCallback, useEffect } from "react";
import type { VoiceProfile, AppSettings } from "../shared/types.ts";
import {
  getAppSettings,
  saveAppSettings,
  createProfile,
  onSettingsChanged,
} from "../shared/storage.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { ProfileList } from "./components/ProfileList.tsx";
import { ProfileEditor } from "./components/ProfileEditor.tsx";
import { CacheView } from "./components/CacheView.tsx";

type Page = "profiles" | "cache";

export function ManagerApp() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [page, setPage] = useState<Page>("profiles");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  useEffect(() => {
    void getAppSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  const handleCreateProfile = useCallback(async () => {
    if (!settings) return;
    const newProfile = createProfile("新方案", "volcengine");
    const updated: AppSettings = {
      ...settings,
      profiles: [...settings.profiles, newProfile],
      activeProfileId: settings.activeProfileId ?? newProfile.id,
    };
    await saveAppSettings(updated);
    setSettings(updated);
    setEditingProfileId(newProfile.id);
  }, [settings]);

  const handleDuplicateProfile = useCallback(
    async (profile: VoiceProfile) => {
      if (!settings) return;
      const dup = createProfile(`${profile.name} (副本)`, profile.provider);
      dup.volcengine = { ...profile.volcengine };
      dup.minimax = { ...profile.minimax };
      const updated: AppSettings = {
        ...settings,
        profiles: [...settings.profiles, dup],
      };
      await saveAppSettings(updated);
      setSettings(updated);
      setEditingProfileId(dup.id);
    },
    [settings],
  );

  const handleDeleteProfile = useCallback(
    async (profileId: string) => {
      if (!settings) return;
      const newProfiles = settings.profiles.filter((p) => p.id !== profileId);
      if (newProfiles.length === 0) return;
      const updated: AppSettings = {
        ...settings,
        profiles: newProfiles,
        activeProfileId:
          settings.activeProfileId === profileId ? newProfiles[0].id : settings.activeProfileId,
      };
      await saveAppSettings(updated);
      setSettings(updated);
      if (editingProfileId === profileId) setEditingProfileId(null);
    },
    [settings, editingProfileId],
  );

  const handleSetActive = useCallback(
    async (profileId: string) => {
      if (!settings) return;
      const updated: AppSettings = { ...settings, activeProfileId: profileId };
      await saveAppSettings(updated);
      setSettings(updated);
    },
    [settings],
  );

  const handleSaveProfile = useCallback(
    async (profile: VoiceProfile) => {
      if (!settings) return;
      const updated: AppSettings = {
        ...settings,
        profiles: settings.profiles.map((p) => (p.id === profile.id ? profile : p)),
      };
      await saveAppSettings(updated);
      setSettings(updated);
    },
    [settings],
  );

  if (!settings) {
    return <div className="flex items-center justify-center h-screen text-gray-400">加载中...</div>;
  }

  const editingProfile = settings.profiles.find((p) => p.id === editingProfileId) ?? null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-auto">
        {page === "profiles" && (
          <div className="flex h-full">
            <div className="w-72 border-r border-gray-200 bg-white p-4 overflow-y-auto flex-shrink-0">
              <ProfileList
                profiles={settings.profiles}
                activeProfileId={settings.activeProfileId}
                editingProfileId={editingProfileId}
                onCreate={handleCreateProfile}
                onSelect={setEditingProfileId}
                onSetActive={handleSetActive}
                onDuplicate={handleDuplicateProfile}
                onDelete={handleDeleteProfile}
              />
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {editingProfile ? (
                <ProfileEditor
                  key={editingProfile.id}
                  profile={editingProfile}
                  onSave={handleSaveProfile}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  选择或创建一个语音方案
                </div>
              )}
            </div>
          </div>
        )}
        {page === "cache" && <CacheView />}
      </main>
    </div>
  );
}
