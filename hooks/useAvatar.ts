// hooks/useAvatar.ts
// Persists avatar URI and reads the saved profile name for initials fallback.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const AVATAR_KEY = "filo:avatar_uri";
const PROFILE_KEY = "filo:profile";

export function useAvatar() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>("F");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(AVATAR_KEY),
      AsyncStorage.getItem(PROFILE_KEY),
    ])
      .then(([uri, raw]) => {
        if (uri) setAvatarUri(uri);
        if (raw) {
          try {
            const p = JSON.parse(raw);
            const i = [p.firstName?.[0], p.lastName?.[0]]
              .filter(Boolean)
              .join("")
              .toUpperCase();
            if (i) setInitials(i);
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveAvatar = useCallback(async (uri: string | null) => {
    setAvatarUri(uri);
    try {
      if (uri) await AsyncStorage.setItem(AVATAR_KEY, uri);
      else await AsyncStorage.removeItem(AVATAR_KEY);
    } catch {}
  }, []);

  return { avatarUri, saveAvatar, initials, loading };
}
