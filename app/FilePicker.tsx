import { useTheme } from "@/providers/ThemeProvider";
import type { Folder } from "@/types";
import { Check, FolderOpen, Plus } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const FOLDER_COLORS = [
  "#34D399",
  "#60A5FA",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#FB923C",
];

interface FolderPickerProps {
  visible: boolean;
  folders: Folder[];
  currentFolder?: string;
  onSelect: (folderId: string) => void;
  onCreateFolder: (name: string, color: string) => void;
  onRemoveFromFolder: () => void;
  onClose: () => void;
}

function FolderPicker({
  visible,
  folders,
  currentFolder,
  onSelect,
  onCreateFolder,
  onRemoveFromFolder,
  onClose,
}: FolderPickerProps) {
  const { colors } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowCreate(false);
      setNewName("");
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateFolder(newName.trim(), selectedColor);
      setNewName("");
      setShowCreate(false);
    }
  };

  const renderFolder = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={[styles.folderItem, { backgroundColor: colors.background }]}
      onPress={() => {
        onSelect(item.id);
        onClose();
      }}
      activeOpacity={0.6}
    >
      <View style={[styles.folderIcon, { backgroundColor: item.color + "20" }]}>
        <FolderOpen color={item.color} size={20} />
      </View>
      <Text style={[styles.folderName, { color: colors.text }]}>
        {item.name}
      </Text>
      {currentFolder === item.id && <Check color={colors.accent} size={18} />}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>
            Move to Folder
          </Text>

          {currentFolder ? (
            <TouchableOpacity
              style={[
                styles.removeBtn,
                { backgroundColor: colors.dangerLight },
              ]}
              onPress={() => {
                onRemoveFromFolder();
                onClose();
              }}
            >
              <Text style={[styles.removeBtnText, { color: colors.danger }]}>
                Remove from folder
              </Text>
            </TouchableOpacity>
          ) : null}

          <FlatList
            data={folders}
            keyExtractor={(item) => item.id}
            renderItem={renderFolder}
            style={styles.list}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No folders yet. Create one below.
              </Text>
            }
          />

          {showCreate ? (
            <View style={styles.createArea}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Folder name"
                placeholderTextColor={colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={styles.colorRow}>
                {FOLDER_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorDotSelected,
                    ]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>
              <View style={styles.createActions}>
                <TouchableOpacity
                  style={[
                    styles.createBtn,
                    { backgroundColor: colors.surfacePressed },
                  ]}
                  onPress={() => setShowCreate(false)}
                >
                  <Text
                    style={[
                      styles.createBtnText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.accent }]}
                  onPress={handleCreate}
                >
                  <Text
                    style={[styles.createBtnText, { color: colors.accentText }]}
                  >
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.newFolderBtn, { borderColor: colors.accent }]}
              onPress={() => setShowCreate(true)}
            >
              <Plus color={colors.accent} size={16} />
              <Text style={[styles.newFolderText, { color: colors.accent }]}>
                New Folder
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default React.memo(FolderPicker);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "600" as const, marginBottom: 16 },
  removeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  removeBtnText: { fontSize: 14, fontWeight: "500" as const },
  list: { maxHeight: 250 },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    gap: 12,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  folderName: { flex: 1, fontSize: 15, fontWeight: "500" as const },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  createArea: { marginTop: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    justifyContent: "center",
  },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff" },
  createActions: { flexDirection: "row", gap: 10 },
  createBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { fontSize: 14, fontWeight: "600" as const },
  newFolderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    marginTop: 8,
  },
  newFolderText: { fontSize: 14, fontWeight: "500" as const },
});
