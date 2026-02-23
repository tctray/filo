import type { ActionSheetAction } from "@/components/ActionSheet";
import ActionSheet from "@/components/ActionSheet";
import FolderPicker from "@/components/FolderPicker";
import RenameModal from "@/components/RenameModal";
import SearchBar from "@/components/SearchBar";
import Toast from "@/components/Toast";
import { useData } from "@/providers/DataProvider";
import { useTheme } from "@/providers/ThemeProvider";
import type { Resume } from "@/types";

import { exportResumeToPdf, exportResumeToRtf } from "@/utils/pdf";

import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";

import {
  ArrowLeft,
  FileText,
  FolderOpen,
  MoreVertical,
  Plus,
  Upload,
} from "lucide-react-native";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResumesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    resumes,
    deleteResume,
    duplicateResume,
    renameResume,
    moveResumeToFolder,
    folders,
    addFolder,
  } = useData();

  const [search, setSearch] = useState("");
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [folderPickerVisible, setFolderPickerVisible] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as const,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return resumes;
    const q = search.toLowerCase();
    return resumes.filter((r) => r.title.toLowerCase().includes(q));
  }, [resumes, search]);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message, type: "success" });
  }, []);

  const openActionSheet = useCallback((resume: Resume) => {
    setSelectedResume(resume);
    setActionSheetVisible(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const handleDuplicate = useCallback(async () => {
    if (!selectedResume) return;
    await duplicateResume(selectedResume.id);
    showToast("Resume duplicated");
  }, [selectedResume, duplicateResume, showToast]);

  const handleRename = useCallback(
    async (newName: string) => {
      if (!selectedResume) return;
      await renameResume(selectedResume.id, newName);
      showToast("Resume renamed");
    },
    [selectedResume, renameResume, showToast],
  );

  const handleExportPdf = useCallback(async () => {
    if (!selectedResume) return;
    try {
      await exportResumeToPdf(selectedResume);
      showToast("Resume exported as PDF");
    } catch (e) {
      Alert.alert("Export Error", "Failed to export PDF.");
    }
  }, [selectedResume, showToast]);

  const handleExportRtf = useCallback(async () => {
    if (!selectedResume) return;
    try {
      await exportResumeToRtf(selectedResume);
      showToast("Resume exported as RTF");
    } catch (e) {
      Alert.alert("Export Error", "Failed to export RTF.");
    }
  }, [selectedResume, showToast]);

  const handleDelete = useCallback(() => {
    if (!selectedResume) return;

    Alert.alert(
      "Delete Resume",
      `Are you sure you want to delete "${selectedResume.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteResume(selectedResume.id);
            showToast("Resume deleted");
          },
        },
      ],
    );
  }, [selectedResume, deleteResume, showToast]);

  const handleMoveToFolder = useCallback(
    async (folderId: string) => {
      if (!selectedResume) return;
      await moveResumeToFolder(selectedResume.id, folderId);
      const folder = folders.find((f) => f.id === folderId);
      showToast(`Moved to ${folder?.name ?? "folder"}`);
    },
    [selectedResume, moveResumeToFolder, folders, showToast],
  );

  const handleRemoveFromFolder = useCallback(async () => {
    if (!selectedResume) return;
    await moveResumeToFolder(selectedResume.id, undefined);
    showToast("Removed from folder");
  }, [selectedResume, moveResumeToFolder, showToast]);

  const handleCreateFolder = useCallback(
    async (name: string, color: string) => {
      await addFolder(name, color);
      showToast(`Folder "${name}" created`);
    },
    [addFolder, showToast],
  );

  const actions: ActionSheetAction[] = useMemo(
    () => [
      {
        label: "Duplicate",
        icon: "duplicate" as const,
        onPress: handleDuplicate,
      },
      {
        label: "Rename",
        icon: "rename" as const,
        onPress: () => setRenameVisible(true),
      },
      {
        label: "Move to Folder",
        icon: "folder" as const,
        onPress: () => setFolderPickerVisible(true),
      },
      {
        label: "Export PDF",
        icon: "export" as const,
        onPress: handleExportPdf,
      },
      {
        label: "Export RTF",
        icon: "export-rtf" as const,
        onPress: handleExportRtf,
      },
      {
        label: "Delete",
        icon: "delete" as const,
        destructive: true,
        onPress: handleDelete,
      },
    ],
    [handleDuplicate, handleExportPdf, handleExportRtf, handleDelete],
  );

  const getFolderForResume = useCallback(
    (folderId?: string) => {
      if (!folderId) return null;
      return folders.find((f) => f.id === folderId) ?? null;
    },
    [folders],
  );

  const renderItem = useCallback(
    ({ item }: { item: Resume }) => {
      const folder = getFolderForResume(item.folder);

      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.cardShadow,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: "/resume-editor" as never,
              params: { id: item.id },
            })
          }
          onLongPress={() => openActionSheet(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: colors.accent + "1A" },
              ]}
            >
              {item.uploadedFile ? (
                <Upload color={colors.accent} size={20} />
              ) : (
                <FileText color={colors.accent} size={20} />
              )}
            </View>

            <View style={styles.cardInfo}>
              <Text
                style={[styles.cardTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
                Updated {formatDate(item.updatedAt)}
              </Text>

              {folder && (
                <View style={styles.folderTag}>
                  <FolderOpen color={folder.color} size={11} />
                  <Text style={[styles.folderTagText, { color: folder.color }]}>
                    {folder.name}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.moreBtn,
                { backgroundColor: colors.surfacePressed },
              ]}
              onPress={() => openActionSheet(item)}
            >
              <MoreVertical color={colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>

          <View
            style={[styles.glowLine, { backgroundColor: colors.accent + "22" }]}
          />
        </TouchableOpacity>
      );
    },
    [colors, router, openActionSheet, getFolderForResume],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Resumes",
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.accent,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <ArrowLeft color={colors.accent} size={22} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search resumes..."
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/resume-editor" as never)}
        >
          <Plus color={colors.accentText} size={24} />
        </TouchableOpacity>

        <ActionSheet
          visible={actionSheetVisible}
          title={selectedResume?.title ?? ""}
          actions={actions}
          onClose={() => setActionSheetVisible(false)}
        />

        <RenameModal
          visible={renameVisible}
          currentName={selectedResume?.title ?? ""}
          onRename={handleRename}
          onClose={() => setRenameVisible(false)}
        />

        <FolderPicker
          visible={folderPickerVisible}
          folders={folders}
          currentFolder={selectedResume?.folder}
          onSelect={handleMoveToFolder}
          onCreateFolder={handleCreateFolder}
          onRemoveFromFolder={handleRemoveFromFolder}
          onClose={() => setFolderPickerVisible(false)}
        />

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  list: { padding: 20, paddingTop: 0, paddingBottom: 120 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600" as const },
  cardMeta: { fontSize: 12, marginTop: 2 },
  folderTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  folderTagText: { fontSize: 11, fontWeight: "500" as const },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  glowLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 14,
    marginHorizontal: -16,
    marginBottom: -16,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 7,
  },
});
