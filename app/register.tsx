import {
  saveAvatarUrlToProfile,
  uploadAvatarForCurrentUser,
} from "@/lib/avatarUpload";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowRight, Camera, FileText } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const AVATAR_SIZE = 88;

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { register, isRegistering, registerError } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [pickingImage, setPickingImage] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const buttonScale = useRef(new Animated.Value(1)).current;

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "F";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "F";
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [name]);

  const handlePressIn = () =>
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();

  const handlePressOut = () =>
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();

  const pickAvatar = async () => {
    try {
      setPickingImage(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow Filo to access your photos to set a profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setAvatarUri(result.assets[0].uri);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not open photo library.";
      Alert.alert("Error", msg);
    } finally {
      setPickingImage(false);
    }
  };

  const handleRegister = async () => {
    setLocalError("");

    if (!email.trim() || !password.trim()) {
      setLocalError("Please fill in all fields");
      return;
    }

    if (password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });

      if (avatarUri) {
        const { publicUrl } = await uploadAvatarForCurrentUser(avatarUri);
        await saveAvatarUrlToProfile(publicUrl);
        setAvatarUri(publicUrl);
      }

      router.replace("/(tabs)" as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setLocalError(msg);
    }
  };

  const errorMsg = localError || registerError;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View
              style={[styles.logoContainer, { backgroundColor: colors.accent }]}
            >
              <FileText color={colors.accentText} size={32} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Filo</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Craft your career, one application at a time
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Create account
            </Text>

            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={pickAvatar}
                activeOpacity={0.8}
                style={[
                  styles.avatarRing,
                  {
                    borderColor: `${colors.accent}55`,
                    backgroundColor: colors.surface ?? colors.inputBackground,
                  },
                ]}
              >
                {pickingImage ? (
                  <ActivityIndicator color={colors.accent} size="large" />
                ) : avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: `${colors.accent}18` },
                    ]}
                  >
                    <Text
                      style={[styles.avatarInitials, { color: colors.accent }]}
                    >
                      {initials}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: colors.accent,
                      borderColor: colors.background,
                    },
                  ]}
                >
                  <Camera size={13} color="#fff" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>

              <Text
                style={[styles.avatarHint, { color: colors.textSecondary }]}
              >
                Add profile photo
              </Text>
            </View>

            {errorMsg ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: colors.dangerLight },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {errorMsg}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Name (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="you@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Confirm Password
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Repeat your password"
                placeholderTextColor={colors.textTertiary}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={handleRegister}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isRegistering}
                activeOpacity={0.9}
              >
                {isRegistering ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text
                      style={[styles.buttonText, { color: colors.accentText }]}
                    >
                      Create Account
                    </Text>
                    <ArrowRight color={colors.accentText} size={18} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.replace("/login" as never)}
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Already have an account?{" "}
              </Text>
              <Text style={[styles.linkAccent, { color: colors.accent }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  header: { alignItems: "center", marginBottom: 32 },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  tagline: { fontSize: 14, marginTop: 6, textAlign: "center" },

  form: { width: "100%" },
  formTitle: { fontSize: 22, fontWeight: "600", marginBottom: 20 },

  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarHint: {
    fontSize: 13,
    fontWeight: "500",
  },

  errorBox: { padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: "500" },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },

  button: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { fontSize: 16, fontWeight: "600" },

  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  linkText: { fontSize: 14 },
  linkAccent: { fontSize: 14, fontWeight: "600" },
});
