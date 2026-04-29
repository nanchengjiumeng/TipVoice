import { useCallback, useEffect, useState, useRef } from "react";
import { fetchMinimaxVoices } from "../../lib/minimax-provider.ts";
import { MINIMAX_VOICE_PRESETS } from "../../shared/constants.ts";
import type { MinimaxSystemVoice } from "../../shared/types.ts";

export interface VoiceOption {
  value: string;
  label: string;
  description: string;
}

function buildVoiceOptions(systemVoices: MinimaxSystemVoice[]): VoiceOption[] {
  const seen = new Set<string>();
  const options: VoiceOption[] = [];

  for (const v of systemVoices) {
    if (!seen.has(v.voice_id)) {
      seen.add(v.voice_id);
      options.push({
        value: v.voice_id,
        label: v.voice_name || v.voice_id,
        description: v.description?.[0] ?? "",
      });
    }
  }

  for (const p of MINIMAX_VOICE_PRESETS) {
    if (!seen.has(p.value)) {
      seen.add(p.value);
      options.push({ value: p.value, label: p.label, description: "" });
    }
  }

  return options;
}

export function useMinimaxVoices(apiKey: string) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVoices = useCallback(() => {
    if (!apiKey) {
      setVoices(
        MINIMAX_VOICE_PRESETS.map((p) => ({ value: p.value, label: p.label, description: "" })),
      );
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchMinimaxVoices(apiKey)
      .then((result) => {
        const systemVoices = result.system_voice ?? [];
        setVoices(buildVoiceOptions(systemVoices));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setVoices(
          MINIMAX_VOICE_PRESETS.map((p) => ({ value: p.value, label: p.label, description: "" })),
        );
      })
      .finally(() => setLoading(false));
  }, [apiKey]);

  // Use ref to avoid re-running on every render
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  return { voices, loading, error, refetch: fetchVoices };
}
