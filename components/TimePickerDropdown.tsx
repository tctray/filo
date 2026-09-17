import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  value?: string; // "09:30 AM" or undefined
  onChange: (v: string) => void; // pass "" to clear
  colors: any;
  stepMinutes?: 5 | 10 | 15 | 30;
};

function parseTime(value?: string) {
  if (!value) return null;
  const m = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!m) return null;
  return {
    hh: String(Number(m[1])), // "09" -> "9"
    mm: m[2], // "30"
    ap: m[3].toUpperCase() as "AM" | "PM",
  };
}

function formatTime(hh: string, mm: string, ap: "AM" | "PM") {
  const h = String(Math.min(Math.max(Number(hh), 1), 12)).padStart(2, "0");
  const m = String(Math.min(Math.max(Number(mm), 0), 59)).padStart(2, "0");
  return `${h}:${m} ${ap}`;
}

export default function TimePickerDropdown({
  value,
  onChange,
  colors,
  stepMinutes = 15,
}: Props) {
  const parsed = parseTime(value);

  // empty by default
  const [hour, setHour] = useState<string>(parsed?.hh ?? "");
  const [minute, setMinute] = useState<string>(parsed?.mm ?? "");
  const [period, setPeriod] = useState<"AM" | "PM">(parsed?.ap ?? "AM");

  useEffect(() => {
    const p = parseTime(value);
    setHour(p?.hh ?? "");
    setMinute(p?.mm ?? "");
    setPeriod(p?.ap ?? "AM");
  }, [value]);

  const minuteOptions = useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 60; m += stepMinutes)
      out.push(String(m).padStart(2, "0"));
    return out;
  }, [stepMinutes]);

  const commitIfReady = (h: string, m: string, ap: "AM" | "PM") => {
    if (!h || !m) {
      onChange("");
      return;
    }
    onChange(formatTime(h, m, ap));
  };

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Time
        </Text>

        {!!value && (
          <TouchableOpacity
            onPress={() => {
              setHour("");
              setMinute("");
              setPeriod("AM");
              onChange("");
            }}
            style={[styles.clearBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* If empty, show helper */}
      {!hour || !minute ? (
        <Text style={[styles.helper, { color: colors.textTertiary }]}>
          Select a time (optional)
        </Text>
      ) : null}

      <View style={styles.pickers}>
        {/* Hour */}
        <View style={[styles.pickerBox, { borderColor: colors.border }]}>
          <Picker
            selectedValue={hour}
            onValueChange={(v) => {
              setHour(v);
              commitIfReady(v, minute, period);
            }}
            dropdownIconColor={colors.textSecondary}
          >
            <Picker.Item label="HH" value="" />
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
              <Picker.Item key={h} label={h} value={h} />
            ))}
          </Picker>
        </View>

        {/* Minute */}
        <View style={[styles.pickerBox, { borderColor: colors.border }]}>
          <Picker
            selectedValue={minute}
            onValueChange={(v) => {
              setMinute(v);
              commitIfReady(hour, v, period);
            }}
            dropdownIconColor={colors.textSecondary}
          >
            <Picker.Item label="MM" value="" />
            {minuteOptions.map((m) => (
              <Picker.Item key={m} label={m} value={m} />
            ))}
          </Picker>
        </View>

        {/* AM/PM */}
        <View style={[styles.pickerBox, { borderColor: colors.border }]}>
          <Picker
            selectedValue={period}
            onValueChange={(v) => {
              const ap = v as "AM" | "PM";
              setPeriod(ap);
              commitIfReady(hour, minute, ap);
            }}
            dropdownIconColor={colors.textSecondary}
          >
            <Picker.Item label="AM" value="AM" />
            <Picker.Item label="PM" value="PM" />
          </Picker>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 12, fontWeight: "700" },
  helper: { marginTop: 6, fontSize: 12 },
  clearBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pickers: { flexDirection: "row", gap: 10, marginTop: 10 },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
});
