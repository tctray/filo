import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, loginError, isLoggingIn, guestLogin, isGuestLoggingIn } =
    useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const buttonScale = useRef(new Animated.Value(1)).current;

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

  const handleLogin = async () => {
    setLocalError("");
    if (!email.trim() || !password.trim()) {
      setLocalError("Please fill in all fields");
      return;
    }
    try {
      await login({ email: email.trim(), password });
      router.replace("/" as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setLocalError(msg);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await guestLogin();
      router.replace("/" as never);
    } catch (_e) {
      setLocalError("Guest login failed");
    }
  };

  const errorMsg = localError || loginError;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.logoContainer, {}]}>
              <Image
                source={require("../assets/images/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Filo</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Craft your career, one application at a time
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              Welcome back
            </Text>

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
                testID="login-email"
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
                placeholder="Your password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                testID="login-password"
              />
              <TouchableOpacity
                onPress={() => router.push("/forgotpass" as never)}
                style={styles.forgotLink}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.forgotLinkText, { color: colors.accent }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={handleLogin}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoggingIn}
                activeOpacity={0.9}
                testID="login-button"
              >
                {isLoggingIn ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text
                      style={[styles.buttonText, { color: colors.accentText }]}
                    >
                      Sign In
                    </Text>
                    <ArrowRight color={colors.accentText} size={18} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Sign Up link → onboarding */}
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push("/register" as never)}
              testID="go-register"
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Don't have an account?{" "}
              </Text>
              <Text style={[styles.linkAccent, { color: colors.accent }]}>
                Sign Up
              </Text>
            </TouchableOpacity>

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

            <TouchableOpacity
              style={[styles.guestButton, { borderColor: colors.border }]}
              onPress={handleGuestLogin}
              disabled={isGuestLoggingIn}
              testID="guest-login"
            >
              {isGuestLoggingIn ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <Text style={[styles.guestButtonText, { color: colors.text }]}>
                  Continue as Guest
                </Text>
              )}
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
  logoImage: {
    width: 75,
    height: 75,
  },
  header: { alignItems: "center", marginBottom: 40 },
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
  forgotLink: { alignSelf: "flex-end", marginTop: 8 },
  forgotLinkText: { fontSize: 13, fontWeight: "600" },
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  guestButton: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderWidth: 1,
  },
  guestButtonText: { fontSize: 15, fontWeight: "500" },
});
