import { useTheme } from "@/providers/ThemeProvider";
import {
    Copy,
    Download,
    Edit3,
    FileType,
    FolderOpen,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export interface ActionSheetAction {
  label: string;
  icon: "duplicate" | "rename" | "folder" | "export" | "export-rtf" | "delete";
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  actions: ActionSheetAction[];
  onClose: () => void;
}

const ICON_MAP = {
  duplicate: Copy,
  rename: Edit3,
  folder: FolderOpen,
  export: Download,
  "export-rtf": FileType,
  delete: Trash2,
};

function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfacePressed },
              ]}
            >
              <X color={colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
          <View style={styles.actionsList}>
            {actions.map((action, idx) => {
              const IconComponent = ICON_MAP[action.icon];
              const iconColor = action.destructive
                ? colors.danger
                : colors.textSecondary;
              const textColor = action.destructive
                ? colors.danger
                : colors.text;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.actionItem,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => {
                    onClose();
                    setTimeout(action.onPress, 300);
                  }}
                  activeOpacity={0.6}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      {
                        backgroundColor: action.destructive
                          ? colors.dangerLight
                          : colors.surfacePressed,
                      },
                    ]}
                  >
                    <IconComponent color={iconColor} size={18} />
                  </View>
                  <Text style={[styles.actionLabel, { color: textColor }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default React.memo(ActionSheet);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: Platform.OS === "web" ? 24 : 40,
    paddingHorizontal: 20,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600" as const,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsList: {
    gap: 6,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
});
