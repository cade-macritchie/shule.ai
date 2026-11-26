export const C = {
  bg: "#0b1020", panel: "#121a33", line: "#24305a", ink: "#e8ecf8", mute: "#8b96b8",
  accent: "#6d7cff", cyan: "#38bdf8", red: "#f05252", amber: "#f5a524", green: "#2fd67b",
};
export const font = "Inter, 'Segoe UI', system-ui, sans-serif";
export const valueColor = (v?: string) => (v === "NVA" ? C.red : v === "BVA" ? C.amber : v === "VA" ? C.green : C.mute);
