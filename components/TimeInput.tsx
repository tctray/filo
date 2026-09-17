import React, { useEffect, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function TimeInput({
  value,
  onChange,
  colors,
}: {
  value?: string;
  onChange: (v: string) => void;
  colors: any;
}) {
  const [hour, setHour] = useState(""); // allow blank while typing
  const [minute, setMinute] = useState(""); // allow blank while typing
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  // ✅ parse incoming value like "09:30 PM" (edit mode)
  useEffect(() => {
    if (!value) return;

    const m = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!m) return;

    setHour(String(Number(m[1]))); // "09" -> "9" so user can edit easily
    setMinute(m[2]); // keep "00" / "30"
    setPeriod(m[3].toUpperCase() as "AM" | "PM");
  }, [value]);

  const commit = (h: string, m: string, p: "AM" | "PM") => {
    // ✅ If user is still typing, don't force "00"
    if (!h || !m) {
      onChange("");
      return;
    }

    let hh = Number(h);
    let mm = Number(m);

    if (Number.isNaN(hh) || Number.isNaN(mm)) {
      onChange("");
      return;
    }

    // clamp
    hh = Math.min(Math.max(hh, 1), 12);
    mm = Math.min(Math.max(mm, 0), 59);

    onChange(
      `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${p}`,
    );
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        value={hour}
        placeholder="hh"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={(v) => {
          const clean = v.replace(/\D/g, "");
          setHour(clean);
          commit(clean, minute, period);
        }}
      />

      <Text style={{ color: colors.text }}>:</Text>

      <TextInput
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        value={minute}
        placeholder="mm"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={(v) => {
          const clean = v.replace(/\D/g, "");
          setMinute(clean);
          commit(hour, clean, period);
        }}
      />

      <TouchableOpacity
        onPress={() => {
          const next = period === "AM" ? "PM" : "AM";
          setPeriod(next);
          commit(hour, minute, next);
        }}
        style={[styles.periodBtn, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontWeight: "700" }}>{period}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 56,
    textAlign: "center",
    fontSize: 15,
  },
  periodBtn: {
    borderWidth: 1,
    padding: 8,
    borderRadius: 8,
    minWidth: 52,
    alignItems: "center",
  },
});
