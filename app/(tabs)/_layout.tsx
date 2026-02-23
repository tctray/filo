import { useTheme } from "@/providers/ThemeProvider";
import { Tabs } from "expo-router";
import { Briefcase, FileText, Home, Mail, Settings } from "lucide-react-native";

export default function TabsLayout() {
  const { colors } = useTheme(); // assuming you have this

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // 👇 THIS FIXES WHITE TAB BAR
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="resumes"
        options={{
          title: "Resumes",
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="coverletters"
        options={{
          title: "Letters",
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          title: "Apps",
          tabBarIcon: ({ color, size }) => (
            <Briefcase color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
