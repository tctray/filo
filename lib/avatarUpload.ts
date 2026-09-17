import { supabase } from "@/lib/supabase";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

type UploadAvatarResult = {
  path: string;
  publicUrl: string;
};

function getFileExtension(uri: string) {
  const cleanUri = uri.split("?")[0];
  const parts = cleanUri.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : "jpg";

  if (!ext || ext.length > 5) return "jpg";
  return ext;
}

function getContentType(ext: string) {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

export async function uploadAvatarForCurrentUser(
  localUri: string,
): Promise<UploadAvatarResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found");

  const ext = getFileExtension(localUri);
  const filePath = `${user.id}/avatar.${ext}`;
  const contentType = getContentType(ext);

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: "base64",
  });

  const arrayBuffer = decode(base64);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    throw new Error("Could not get avatar public URL");
  }

  return {
    path: filePath,
    publicUrl: publicData.publicUrl,
  };
}

export async function saveAvatarUrlToProfile(avatarUrl: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) throw error;
}
