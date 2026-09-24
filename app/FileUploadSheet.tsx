import { useTheme } from "@/providers/ThemeProvider";
import { Edit3, Upload } from "lucide-react-native";
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

interface FileUploadSheetProps {
  visible: boolean;
  title: string;
  onUpload: () => void;
  onManual: () => void;
  onClose: () => void;
}

function FileUploadSheet({
  visible,
  title,
  onUpload,
  onManual,
  onClose,
}: FileUploadSheetProps) {
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
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            How would you like to create this document?
          </Text>

          <TouchableOpacity
            style={[
              styles.option,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              onClose();
              setTimeout(onUpload, 300);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Upload color={colors.accent} size={22} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Upload File
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textTertiary }]}>
                Import a PDF or DOCX file
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              onClose();
              setTimeout(onManual, 300);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[styles.optionIcon, { backgroundColor: colors.infoLight }]}
            >
              <Edit3 color={colors.info} size={22} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Create Manually
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textTertiary }]}>
                Build from scratch with the editor
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default React.memo(FileUploadSheet);

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
    paddingBottom: Platform.OS === "web" ? 24 : 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700" as const, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: "600" as const },
  optionDesc: { fontSize: 13, marginTop: 2 },
});
