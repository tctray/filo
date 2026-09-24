// app/forgot-password.tsx
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { notify } from "@/utils/notify";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
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

// Where Supabase's reset link should send the user back to.
// On web this is the deployed site; on native there's no equivalent
// deep-link handler set up yet, so this flow is web-only for now.
function getRedirectTo() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // Use the current origin + path up to (and including) the repo
    // name, so this works correctly under the /filo/ subpath on
    // GitHub Pages as well as on other hosts.
    const { origin, pathname } = window.location;
    const base = pathname.includes("/filo/") ? `${origin}/filo` : `${origin}`;
    return `${base}/reset-password`;
  }
  return "filo://reset-password";
}

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth() as any;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      notify("Email required", "Please enter your email address.");
      return;
    }
    try {
      setSending(true);
      await sendPasswordReset(trimmed, getRedirectTo());
      setSent(true);
    } catch (e: any) {
      notify(
        "Couldn't send reset email",
        e?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[styles.iconWrap, { backgroundColor: colors.accent + "18" }]}
          >
            <Mail color={colors.accent} size={26} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Reset your password
          </Text>

          {sent ? (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                If an account exists for{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {email.trim()}
                </Text>
                , we've sent a link to reset your password. Check your inbox
                (and spam folder).
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }]}
                onPress={() => router.replace("/login" as never)}
                activeOpacity={0.85}
              >
                <Text style={[styles.buttonText, { color: colors.accentText }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter the email address associated with your account and we'll
                send you a link to reset your password.
              </Text>

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
                  onSubmitEditing={handleSend}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.accent,
                    opacity: sending ? 0.7 : 1,
                  },
                ]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text
                    style={[styles.buttonText, { color: colors.accentText }]}
                  >
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { paddingHorizontal: 12, paddingTop: 8 },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  inputGroup: { marginBottom: 20 },
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
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
});
