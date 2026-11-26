// shule brand (Studio + chapel accent), dark variant for video.
export const C = {
  bg: "#1B2B5B", panel: "#24376E", line: "#3A4E86", ink: "#FFF8F3", mute: "#C3CBE6",
  accent: "#C8402B", cyan: "#FFD27A", red: "#F0857A", amber: "#FFD27A", green: "#6FD3A6", violet: "#8E6CC9",
};
export const font = "'Plus Jakarta Sans', Inter, 'Segoe UI', system-ui, sans-serif";
export const valueColor = (v?: string) => (v === "NVA" ? C.red : v === "BVA" ? C.amber : v === "VA" ? C.green : C.mute);
