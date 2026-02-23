import { useTheme } from "@/providers/ThemeProvider";
import { Directory, File as FSFile, Paths } from "expo-file-system";
import { Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  CheckCircle,
  ExternalLink,
  Eye,
  File as FileIcon,
  FileText,
  FileType,
  Share2,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function FileViewerScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    uri: string;
    name: string;
    mimeType: string;
    size?: string;
    content?: string; // for RTF content (optional)
  }>();

  const uri = params.uri ?? "";
  const name = params.name ?? "Unknown File";
  const mimeType = params.mimeType ?? "";
  const size = params.size ? Number(params.size) : undefined;
  const rtfContent = params.content ?? "";

  const isPdf = mimeType.includes("pdf") || name.toLowerCase().endsWith(".pdf");
  const isDocx =
    mimeType.includes("wordprocessingml") ||
    name.toLowerCase().endsWith(".docx");
  const isRtf = mimeType.includes("rtf") || name.toLowerCase().endsWith(".rtf");
  const fileType = isPdf ? "PDF" : isDocx ? "DOCX" : isRtf ? "RTF" : "Document";

  const [showPreview, setShowPreview] = useState(
    isPdf && Platform.OS === "web",
  );
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rtfContent) setPreviewText(rtfContent);
  }, [rtfContent]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getIconColor = () => {
    if (isPdf) return colors.danger;
    if (isRtf) return colors.success;
    return colors.info;
  };

  const iconColor = getIconColor();

  const downloadOnWeb = (downloadUri: string, downloadName: string) => {
    const link = document.createElement("a");
    link.href = downloadUri;
    link.download = downloadName;
    link.click();
  };

  const handleNativeOpen = useCallback(async () => {
    // WEB: open or download
    if (Platform.OS === "web") {
      try {
        if (rtfContent) {
          const blob = new Blob([rtfContent], { type: "application/rtf" });
          const url = URL.createObjectURL(blob);
          downloadOnWeb(url, name);
          URL.revokeObjectURL(url);
          return;
        }

        // If it's a URL, open in new tab
        window.open(uri, "_blank");
        return;
      } catch {
        Alert.alert("Error", "Unable to open file on web.");
        return;
      }
    }

    // NATIVE: share/open with...
    setLoading(true);
    try {
      // If we have raw RTF content, write it to cache first
      if (rtfContent) {
        const rtfFile = new FSFile(Paths.cache, name);
        await rtfFile.write(rtfContent);

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(rtfFile.uri, {
            mimeType: "application/rtf",
            dialogTitle: `Open ${name}`,
            UTI: "public.rtf",
          });
        } else {
          Alert.alert(
            "Sharing not available",
            "Sharing is not supported on this device.",
          );
        }
        return;
      }

      // Otherwise, ensure we have a local file URI
      let fileUri = uri;

      if (uri.startsWith("http://") || uri.startsWith("https://")) {
        const cacheDir = new Directory(Paths.cache);
        const downloadedFile = await FSFile.downloadFileAsync(uri, cacheDir);
        fileUri = downloadedFile.uri;
      }

      const fileRef = new FSFile(fileUri);
      if (!fileRef.exists) {
        Alert.alert(
          "File Not Found",
          "The file could not be located on this device.",
        );
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType || "application/octet-stream",
          dialogTitle: `Open ${name}`,
          UTI: isPdf
            ? "com.adobe.pdf"
            : isDocx
              ? "org.openxmlformats.wordprocessingml.document"
              : "public.data",
        });
      } else {
        const canOpen = await Linking.canOpenURL(fileUri);
        if (canOpen) {
          await Linking.openURL(fileUri);
        } else {
          Alert.alert(
            "Cannot Open",
            "No app available to open this file. Try downloading it instead.",
          );
        }
      }
    } catch (e) {
      console.log("[FileViewer] Open error:", e);
      Alert.alert(
        "Error",
        "Failed to open file. The file may have been moved or deleted.",
      );
    } finally {
      setLoading(false);
    }
  }, [uri, name, mimeType, isPdf, isDocx, rtfContent]);

  const handleShare = useCallback(async () => {
    // WEB: download
    if (Platform.OS === "web") {
      try {
        if (rtfContent) {
          const blob = new Blob([rtfContent], { type: "application/rtf" });
          const url = URL.createObjectURL(blob);
          downloadOnWeb(url, name);
          URL.revokeObjectURL(url);
          return;
        }

        downloadOnWeb(uri, name);
      } catch {
        Alert.alert("Error", "Unable to download file on web.");
      }
      return;
    }

    // NATIVE: share
    setLoading(true);
    try {
      let fileUri = uri;

      if (rtfContent) {
        const rtfFile = new FSFile(Paths.cache, name);
        await rtfFile.write(rtfContent);
        fileUri = rtfFile.uri;
      } else if (uri.startsWith("http://") || uri.startsWith("https://")) {
        const cacheDir = new Directory(Paths.cache);
        const downloadedFile = await FSFile.downloadFileAsync(uri, cacheDir);
        fileUri = downloadedFile.uri;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: rtfContent ? "application/rtf" : mimeType,
          dialogTitle: `Share ${name}`,
        });
      } else {
        Alert.alert(
          "Sharing not available",
          "Sharing is not supported on this device.",
        );
      }
    } catch (e) {
      console.log("[FileViewer] Share error:", e);
      Alert.alert("Error", "Failed to share file.");
    } finally {
      setLoading(false);
    }
  }, [uri, name, mimeType, rtfContent]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: name,
          headerTitleStyle: { fontSize: 16 },
        }}
      />

      {showPreview && isPdf && Platform.OS === "web" ? (
        <View style={styles.previewContainer}>
          <iframe
            src={uri}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: 12,
            }}
            title={name}
          />
        </View>
      ) : previewText ? (
        <View style={styles.rtfPreviewOuter}>
          <View
            style={[
              styles.rtfPreviewHeader,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <FileType color={colors.success} size={18} />
            <Text style={[styles.rtfPreviewLabel, { color: colors.text }]}>
              RTF Preview
            </Text>
          </View>

          <ScrollView
            style={[
              styles.rtfPreviewScroll,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            contentContainerStyle={styles.rtfPreviewContent}
            showsVerticalScrollIndicator
          >
            <Text style={[styles.rtfPreviewText, { color: colors.text }]}>
              {previewText}
            </Text>
          </ScrollView>

          <View style={styles.rtfActionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.primaryAction,
                { backgroundColor: colors.accent },
              ]}
              onPress={handleNativeOpen}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.accentText} size="small" />
              ) : (
                <>
                  <ExternalLink color={colors.accentText} size={20} />
                  <Text
                    style={[styles.actionBtnText, { color: colors.accentText }]}
                  >
                    {Platform.OS === "web" ? "Download RTF" : "Open RTF"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleShare}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Share2 color={colors.text} size={20} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    {Platform.OS === "web" ? "Download" : "Share"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <View
              style={[
                styles.fileIconContainer,
                { backgroundColor: iconColor + "15" },
              ]}
            >
              <View
                style={[
                  styles.fileIconInner,
                  { backgroundColor: iconColor + "20" },
                ]}
              >
                {isPdf ? (
                  <FileText color={iconColor} size={48} strokeWidth={1.5} />
                ) : isRtf ? (
                  <FileType color={iconColor} size={48} strokeWidth={1.5} />
                ) : (
                  <FileIcon color={iconColor} size={48} strokeWidth={1.5} />
                )}
              </View>
            </View>

            <Text
              style={[styles.fileName, { color: colors.text }]}
              numberOfLines={2}
            >
              {name}
            </Text>

            <View style={styles.metaRow}>
              <View
                style={[styles.badge, { backgroundColor: iconColor + "18" }]}
              >
                <Text style={[styles.badgeText, { color: iconColor }]}>
                  {fileType}
                </Text>
              </View>
              {size != null && (
                <Text style={[styles.sizeText, { color: colors.textTertiary }]}>
                  {formatSize(size)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.actionsSection}>
            {isPdf && Platform.OS === "web" && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.primaryAction,
                  { backgroundColor: colors.accent },
                ]}
                onPress={() => setShowPreview(true)}
                activeOpacity={0.8}
              >
                <Eye color={colors.accentText} size={20} />
                <Text
                  style={[styles.actionBtnText, { color: colors.accentText }]}
                >
                  Preview PDF
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.actionBtn,
                isPdf && Platform.OS === "web"
                  ? {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }
                  : { ...styles.primaryAction, backgroundColor: colors.accent },
              ]}
              onPress={handleNativeOpen}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  color={
                    isPdf && Platform.OS === "web"
                      ? colors.text
                      : colors.accentText
                  }
                  size="small"
                />
              ) : (
                <>
                  <ExternalLink
                    color={
                      isPdf && Platform.OS === "web"
                        ? colors.text
                        : colors.accentText
                    }
                    size={20}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color:
                          isPdf && Platform.OS === "web"
                            ? colors.text
                            : colors.accentText,
                      },
                    ]}
                  >
                    {Platform.OS === "web" ? "Open File" : "Open with..."}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleShare}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Share2 color={colors.text} size={20} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    {Platform.OS === "web" ? "Download" : "Share"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
              File Details
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { color: colors.textSecondary }]}>
                Name
              </Text>
              <Text
                style={[styles.infoValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>

            <View
              style={[styles.infoDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { color: colors.textSecondary }]}>
                Type
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {fileType}
              </Text>
            </View>

            {size != null && (
              <>
                <View
                  style={[
                    styles.infoDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={styles.infoRow}>
                  <Text
                    style={[styles.infoKey, { color: colors.textSecondary }]}
                  >
                    Size
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatSize(size)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {Platform.OS !== "web" && (
            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: colors.successLight,
                  borderColor: colors.success + "30",
                },
              ]}
            >
              <CheckCircle color={colors.success} size={16} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Tap "Open with..." to view this file in your device's default
                viewer
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  previewContainer: {
    flex: 1,
    padding: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 32,
  },
  fileIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  fileIconInner: {
    width: 100,
    height: 100,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  sizeText: {
    fontSize: 13,
  },
  actionsSection: {
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryAction: {},
  actionBtnText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoKey: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    flex: 1,
    textAlign: "right" as const,
    marginLeft: 16,
  },
  infoDivider: {
    height: 1,
    marginVertical: 4,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  rtfPreviewOuter: {
    flex: 1,
    padding: 12,
  },
  rtfPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  rtfPreviewLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  rtfPreviewScroll: {
    flex: 1,
    borderWidth: 1,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  rtfPreviewContent: {
    padding: 16,
  },
  rtfPreviewText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  rtfActionsRow: {
    gap: 10,
    marginTop: 12,
  },
});
