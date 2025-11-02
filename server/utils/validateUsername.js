export function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, message: "Username is required" };
  }

  const trimmed = username.trim();
  const regex = /^[a-z0-9_]+$/; 

  if (!regex.test(trimmed)) {
    return {
      valid: false,
      message:
        "Username should be in small letters only (a–z, 0–9, underscores allowed)",
    };
  }

  return { valid: true, username: trimmed };
}
