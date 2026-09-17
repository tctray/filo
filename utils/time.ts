export function convert12hToIso(date?: string, time?: string) {
  if (!date) return undefined;

  if (!time) return new Date(`${date}T09:00:00`).toISOString();

  const [hm, period] = time.split(" ");
  let [hour, minute] = hm.split(":").map(Number);

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const iso = new Date(
    `${date}T${hour.toString().padStart(2, "0")}:${minute}:00`,
  ).toISOString();

  return iso;
}
