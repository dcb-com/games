interface Me {
  name: string;
  email: string;
  role: "agent" | "admin";
}

// The signed-in staff member. Made up. The real hook loads it, so `data` is
// missing until it arrives; the copied screens check for that.
const ME: Me = {
  name: "Alex Agent",
  email: "alex.agent@example.com",
  role: "agent",
};

export function useMe(): { data: Me | undefined } {
  return { data: ME };
}

export function useIsAdmin(): boolean {
  return useMe().data?.role === "admin";
}
