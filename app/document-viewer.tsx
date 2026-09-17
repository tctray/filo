// app/document-viewer.tsx
import { rtfToPlainText } from "@/utils/rtfToText";
import { File, Paths } from "expo-file-system";
import * as LegacyFS from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { WebView } from "react-native-webview";

type Params = {
  title?: string;
  rtfUrl?: string; // remote URL (Supabase signed/public)
  pdfUrl?: string; // remote URL (Supabase signed/public)
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function DocumentViewerScreen() {
  const params = useLocalSearchParams<Params>();

  // Normalize (expo-router can return string | string[] | undefined)
  const title = asString(params.title) || "Document";
  const rtfUrl = asString(params.rtfUrl);
  const pdfUrl = asString(params.pdfUrl);

  const [loadingText, setLoadingText] = useState(false);
  const [rtfRaw, setRtfRaw] = useState<string>("");

  // Only show PDF if we actually have a usable http(s) URL
  const showPdf = !!pdfUrl && /^https?:\/\//i.test(pdfUrl);

  // Fetch RTF only if we need fallback text preview
  useEffect(() => {
    if (showPdf) return;
    if (!rtfUrl) return;

    let alive = true;

    (async () => {
      try {
        setLoadingText(true);
        const res = await fetch(rtfUrl);
        const raw = await res.text();
        if (alive) setRtfRaw(raw);
      } catch {
        Alert.alert("Couldn’t load document", "RTF text preview failed.");
      } finally {
        if (alive) setLoadingText(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [showPdf, rtfUrl]);

  const plainText = useMemo(() => rtfToPlainText(rtfRaw), [rtfRaw]);

  async function shareOriginalRTF() {
    if (!rtfUrl) {
      Alert.alert("No file", "No RTF URL was provided.");
      return;
    }

    try {
      const filename = `${title}.rtf`.replace(/[^\w.-]+/g, "_");

      // ✅ New FileSystem API path
      const targetFile = new File(Paths.document, filename);

      // ✅ downloadAsync moved to legacy module in newer Expo
      const download = await LegacyFS.downloadAsync(rtfUrl, targetFile.uri);

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Sharing not available", `Saved to: ${download.uri}`);
        return;
      }

      await Sharing.shareAsync(download.uri, {
        mimeType: "text/rtf",
        dialogTitle: "Share original RTF",
      });
    } catch {
      Alert.alert("Share failed", "Could not download/share the original RTF.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0b0b0b" }}>
      {/* Header */}
      <View style={{ padding: 14, gap: 10 }}>
        <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
          {title}
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {rtfUrl ? (
            <Pressable
              onPress={shareOriginalRTF}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                Share original (RTF)
              </Text>
            </Pressable>
          ) : null}
        </View>

        {showPdf ? (
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>
            Viewing PDF preview
          </Text>
        ) : (
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>
            PDF preview not available — showing text fallback
          </Text>
        )}
      </View>

      {/* Body */}
      <View style={{ flex: 1 }}>
        {showPdf ? (
          <WebView
            source={{ uri: pdfUrl }}
            startInLoadingState
            renderLoading={() => (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator />
                <Text style={{ marginTop: 10, color: "white" }}>
                  Loading PDF…
                </Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            allowsInlineMediaPlayback
          />
        ) : loadingText ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator />
            <Text style={{ marginTop: 10, color: "white" }}>
              Loading text preview…
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          >
            <Text style={{ color: "white", lineHeight: 22 }}>
              {plainText || "No preview text available."}
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
