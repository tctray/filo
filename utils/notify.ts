import { Alert, Platform } from "react-native";

/** Simple one-button alert (like a toast/notice). */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/**
 * Confirm/cancel dialog. Calls onConfirm only if the user confirms.
 * confirmLabel/cancelLabel are cosmetic on native only — web's
 * window.confirm always shows "OK"/"Cancel".
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel: string = "Delete",
  destructive: boolean = true,
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ]);
  }
}
