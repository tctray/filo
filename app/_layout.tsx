import { AuthProvider } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="resume-editor" />
            <Stack.Screen name="coverletter-editor" />
            <Stack.Screen name="application-editor" />
            <Stack.Screen name="templates" />
            <Stack.Screen name="file-viewer" />
          </Stack>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
