// app/reset-password.tsx
//
// The user arrives here by clicking the link in the password-reset
// email. Supabase's client (detectSessionInUrl, on by default) reads
// the recovery token out of the URL fragment and establishes a
// temporary session automatically on web — this screen just needs to
// collect a new password and call supabase.auth.updateUser().
//
// Native note: this screen is written to work, but nothing currently
// listens for the filo:// deep link on native and hands the token to
// Supabase, so on native this flow isn't reachable yet. Native users
// can still complete a reset via the web version of the app.

import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { notify } from "@/utils/notify";
import { useRouter } from "expo-router";
import { KeyRound } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Give Supabase's client a moment to parse the URL and establish
    // the recovery session before we check for it.
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!password.trim() || password.length < 6) {
      notify("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      notify("Passwords don't match", "Please re-enter matching passwords.");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (e: any) {
      notify(
        "Couldn't reset password",
        e?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (checkingSession) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          styles.centerFill,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (!hasRecoverySession) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          styles.centerFill,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.scroll}>
          <Text style={[styles.title, { color: colors.text }]}>
            This link has expired
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Password reset links only work once and expire after a while.
            Request a new one from the login screen.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => router.replace("/forgot-password" as never)}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: colors.accentText }]}>
              Request New Link
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
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
            <KeyRound color={colors.accent} size={26} />
          </View>

          {done ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                Password updated
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your password has been changed. You can now sign in with your
                new password.
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
              <Text style={[styles.title, { color: colors.text }]}>
                Set a new password
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose a new password for your account.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  New Password
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
                  placeholder="Repeat your new password"
                  placeholderTextColor={colors.textTertiary}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 },
                ]}
                onPress={handleSubmit}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Text
                    style={[styles.buttonText, { color: colors.accentText }]}
                  >
                    Update Password
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
  centerFill: { alignItems: "center", justifyContent: "center" },
  scroll: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 28,
    paddingTop: 60,
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
