// app/onboarding.tsx
// First-run profile setup screen.
// Collects first name, last name, email, and avatar photo.
// Saves avatar via useAvatar (shared with index + settings).
// Saves name/email to AsyncStorage under filo:profile so AuthProvider
// or any screen can read it.
// Skip → /login   |   Continue → /(tabs)

import { useAvatar } from "@/hooks/useAvatar";
import { useTheme } from "@/providers/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, ChevronRight, LogIn, User } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const PROFILE_KEY = "filo:profile";

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { avatarUri, saveAvatar } = useAvatar();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  // Focus animations for inputs
  const firstNameScale = useRef(new Animated.Value(1)).current;
  const lastNameScale = useRef(new Animated.Value(1)).current;
  const emailScale = useRef(new Animated.Value(1)).current;

  const animateFocus = (anim: Animated.Value, focused: boolean) => {
    Animated.spring(anim, {
      toValue: focused ? 1.015 : 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await saveAvatar(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not open photo library.");
    } finally {
      setPickingImage(false);
    }
  };

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert(
        "First name required",
        "Please enter your first name to continue.",
      );
      return;
    }
    setSaving(true);
    try {
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          completedOnboarding: true,
        }),
      );
      router.replace("/(tabs)" as never);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.replace("/login" as never);
  };

  const isValid = firstName.trim().length > 0;

  // Derived initials for avatar placeholder
  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || "F";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Skip ── */}
      <View style={styles.skipRow}>
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoChip,
                {
                  backgroundColor: colors.accent + "18",
                  borderColor: colors.accent + "30",
                },
              ]}
            >
              <Text style={[styles.logoChipText, { color: colors.accent }]}>
                Filo
              </Text>
            </View>
            <Text style={[styles.headline, { color: colors.text }]}>
              Set up your{"\n"}profile
            </Text>
            <Text style={[styles.subline, { color: colors.textSecondary }]}>
              Personalize Filo so your career docs feel like yours.
            </Text>
          </View>

          {/* ── Avatar picker ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.8}
              style={[
                styles.avatarRing,
                {
                  borderColor: colors.accent + "50",
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {pickingImage ? (
                <ActivityIndicator color={colors.accent} size="large" />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.accent + "18" },
                  ]}
                >
                  <Text
                    style={[styles.avatarInitials, { color: colors.accent }]}
                  >
                    {initials}
                  </Text>
                </View>
              )}

              {/* Camera badge */}
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

            <Text style={[styles.avatarHint, { color: colors.textTertiary }]}>
              Tap to add a photo
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>
            {/* First Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                First Name *
              </Text>
              <Animated.View style={{ transform: [{ scale: firstNameScale }] }}>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <User
                    size={16}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jane"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.text }]}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    onFocus={() => animateFocus(firstNameScale, true)}
                    onBlur={() => animateFocus(firstNameScale, false)}
                  />
                  {firstName.length > 0 && (
                    <View
                      style={[
                        styles.checkDot,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  )}
                </View>
              </Animated.View>
            </View>

            {/* Last Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Last Name
              </Text>
              <Animated.View style={{ transform: [{ scale: lastNameScale }] }}>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <User
                    size={16}
                    color={colors.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Doe"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.text }]}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    onFocus={() => animateFocus(lastNameScale, true)}
                    onBlur={() => animateFocus(lastNameScale, false)}
                  />
                  {lastName.length > 0 && (
                    <View
                      style={[
                        styles.checkDot,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  )}
                </View>
              </Animated.View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Email
              </Text>
              <Animated.View style={{ transform: [{ scale: emailScale }] }}>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.atSign, { color: colors.textTertiary }]}>
                    @
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="jane@example.com"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.text }]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={isValid ? handleContinue : undefined}
                    onFocus={() => animateFocus(emailScale, true)}
                    onBlur={() => animateFocus(emailScale, false)}
                  />
                  {email.includes("@") && (
                    <View
                      style={[
                        styles.checkDot,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  )}
                </View>
              </Animated.View>
            </View>
          </View>

          {/* ── Spacer ── */}
          <View style={{ flex: 1, minHeight: 32 }} />

          {/* ── Continue button ── */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleContinue}
              disabled={!isValid || saving}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: !isValid || saving ? 0.5 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#0C1410" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Continue</Text>
                  <ChevronRight size={18} color="#0C1410" strokeWidth={2.8} />
                </>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
              <Text
                style={[styles.dividerText, { color: colors.textTertiary }]}
              >
                or
              </Text>
              <View
                style={[styles.dividerLine, { backgroundColor: colors.border }]}
              />
            </View>

            {/* Login button */}
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surface : "transparent",
                },
              ]}
            >
              <LogIn size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Skipa
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 14, fontWeight: "500" },

  // Scroll
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Header
  header: { marginBottom: 32, marginTop: 8 },
  logoChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 18,
  },
  logoChipText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 10,
  },
  subline: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },

  // Avatar
  avatarSection: { alignItems: "center", marginBottom: 36 },
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
    fontSize: 36,
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
  avatarHint: { fontSize: 13, fontWeight: "500" },

  // Form
  form: { gap: 16, marginBottom: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputIcon: { flexShrink: 0 },
  atSign: { fontSize: 16, fontWeight: "600", flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    paddingVertical: 0,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  // Actions
  actions: { gap: 12, paddingTop: 8 },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0C1410",
    letterSpacing: -0.2,
  },

  // Divider
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, fontWeight: "500" },

  // Secondary
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
});
