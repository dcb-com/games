export function roleLabel(role: "agent" | "admin"): string {
  return role === "admin" ? "Admin" : "Support agent";
}
