/**
 * Basic email format validation.
 * Covers most common cases but may not handle all edge cases (RFC 5322).
 * @param email The email string to validate.
 * @returns True if the email format is considered valid, false otherwise.
 */
export const isValidEmail = (email: string): boolean => {
  // Simple regex for common email patterns
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}; 