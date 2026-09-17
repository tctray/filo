// app/pdf-viewer.tsx
// Cross-platform PDF viewer for Expo
// iOS/Android: WebView with Google Docs viewer for remote, direct for local
// Web: iframe

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Conditional import — WebView only on native
let WebView: any = null;
if (Platform.OS !== "web") {
  try {
    WebView = require("react-native-webview").WebView;
  } catch {
    // not installed yet
  }
}

function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith("file://") ||
    uri.startsWith("/") ||
    uri.startsWith("content://")
  );
}

function buildViewerUrl(uri: string): string {
  if (Platform.OS === "web") return uri;
  // Local files can be loaded directly in WebView
  if (isLocalUri(uri)) return uri;
  // Remote PDFs use Google Docs viewer for reliable rendering
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`;
}

// Web fallback — renders an iframe
function WebPdfViewer({ uri, colors }: { uri: string; colors: any }) {
  return (
    <View style={styles.webFrame}>
      <iframe
        src={uri}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: colors.background,
        }}
        title="PDF Viewer"
      />
    </View>
  );
}

// Native WebView viewer
function NativePdfViewer({
  uri,
  colors,
  onLoadStart,
  onLoadEnd,
  onError,
}: {
  uri: string;
  colors: any;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onError: () => void;
}) {
  const viewerUrl = buildViewerUrl(uri);
  const isLocal = isLocalUri(uri);

  if (!WebView) {
    return (
      <View style={[styles.errorWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={40} color={colors.warning} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          WebView not installed
        </Text>
        <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
          Run: npx expo install react-native-webview
        </Text>
      </View>
    );
  }

  if (isLocal) {
    // Local PDF — render directly
    return (
      <WebView
        style={{ flex: 1, backgroundColor: colors.background }}
        source={{ uri }}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onError={onError}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        originWhitelist={["*"]}
        scalesPageToFit
        bounces={false}
      />
    );
  }

  // Remote PDF via Google Docs viewer
  return (
    <WebView
      style={{ flex: 1, backgroundColor: colors.background }}
      source={{ uri: viewerUrl }}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={onError}
      originWhitelist={["*"]}
      scalesPageToFit
      bounces={false}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

export default function PdfViewerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ uri: string; name?: string }>();

  const uri = params.uri ?? "";
  const fileName = params.name ?? "Document.pdf";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!uri) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorWrap}>
          <Ionicons
            name="document-outline"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            No file provided
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.accent }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={colors.accent}
          />
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {fileName}
          </Text>
        </View>

        <View style={styles.headerBtn} />
      </View>

      {/* Loading overlay */}
      {loading && !error && (
        <View
          style={[
            styles.loadingOverlay,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading PDF...
          </Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View
          style={[styles.errorWrap, { backgroundColor: colors.background }]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.danger}
          />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Failed to load PDF
          </Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            The file may be unavailable or corrupted
          </Text>
          <TouchableOpacity
            onPress={() => {
              setError(false);
              setLoading(true);
            }}
            style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.retryText, { color: colors.accentText }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PDF content */}
      {!error && (
        <View style={styles.viewer}>
          {Platform.OS === "web" ? (
            <WebPdfViewer uri={uri} colors={colors} />
          ) : (
            <NativePdfViewer
              uri={uri}
              colors={colors}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  headerTitle: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  viewer: { flex: 1 },
  webFrame: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  loadingText: { fontSize: 14 },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  errorTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { fontSize: 15, fontWeight: "600" },
  backLink: { fontSize: 15, fontWeight: "600" },
});
