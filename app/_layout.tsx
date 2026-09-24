import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-get-random-values";

import WebNotificationBanner from "@/components/WebNotificationBanner";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

import * as Notifications from "expo-notifications";
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

void SplashScreen.preventAutoHideAsync();

// ── Auth redirect ────────────────────────────────────────────────────────────
function AuthGuard() {
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const currentScreen = segments[0] as string | undefined;
    const inTabs = currentScreen === "(tabs)";
    const inAuth =
      currentScreen === "login" ||
      currentScreen === "register" ||
      currentScreen === "forgotpass" ||
      currentScreen === "reset-password";
    if (!user && inTabs) {
      router.replace("/login" as never);
    } else if (user && inAuth) {
      router.replace("/(tabs)" as never);
    } else if (!user && !inAuth && !inTabs) {
      router.replace("/login" as never);
    }
  }, [user, segments, ready, router]);

  return null;
}

// ── Animated splash ──────────────────────────────────────────────────────────
function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  useEffect(() => {
    const timeout = setTimeout(finish, 4000);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
    ]).start(() => finish());

    return () => clearTimeout(timeout);
  }, [logoOpacity, logoScale, screenOpacity]);

  return (
    <Animated.View style={[styles.splash, { opacity: screenOpacity }]}>
      <Animated.Image
        source={require("../assets/images/icon.png")}
        style={[
          styles.logoImage,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.filoText, { opacity: logoOpacity }]}>
        FILO
      </Animated.Text>
    </Animated.View>
  );
}

function RootLayoutInner() {
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashDone = async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {}
    setSplashDone(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setSplashDone(true);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone) {
    return <AnimatedSplash onDone={handleSplashDone} />;
  }

  return (
    <>
      {Platform.OS === "web" && <WebNotificationBanner />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="resume-editor" />
        <Stack.Screen name="coverletter-editor" />
        <Stack.Screen name="application-editor" />
        <Stack.Screen name="templates" />
        <Stack.Screen name="file-viewer" />
        <Stack.Screen name="job/[id]" />
        <Stack.Screen name="job/new" />
        <Stack.Screen name="resume-viewer" />
        <Stack.Screen name="coverletter-viewer" />
        <Stack.Screen name="application-viewer" />
        <Stack.Screen name="pdf-viewer" />
      </Stack>
      <AuthGuard />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <RootLayoutInner />
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  filoText: {
    fontSize: 52,
    fontWeight: "900",
    color: "#2DD4BF",
    letterSpacing: 12,
  },
  logoImage: { width: 120, height: 120 },
});
