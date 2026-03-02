export function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, message: "Username is required" };
  }

  const trimmed = username.trim();
  const regex = /^(?![._])(?!.*[._]{2})[a-z0-9._]{1,30}(?<![._])$/;

  if (!regex.test(trimmed)) {
    return {
      valid: false,
      message:
        "Username can contain lowercase letters, numbers, dots and underscores. It cannot start or end with dot/underscore, or contain consecutive dots/underscores.",
    };
  }

  return { valid: true, username: trimmed };
}