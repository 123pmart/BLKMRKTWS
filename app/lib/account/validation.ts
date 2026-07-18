export interface RegistrationInput {
  storeName: string;
  contactName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  salesperson: "parker" | "matt" | "beau";
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: Record<string, string>;
}

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function validateRegistration(input: Partial<RegistrationInput>): ValidationResult<RegistrationInput> {
  const value: RegistrationInput = {
    storeName: clean(input.storeName, 120),
    contactName: clean(input.contactName, 120),
    email: clean(input.email, 180).toLowerCase(),
    username: normalizeUsername(input.username).slice(0, 40),
    password: String(input.password ?? ""),
    confirmPassword: String(input.confirmPassword ?? ""),
    salesperson: String(input.salesperson ?? "").trim().toLowerCase() as RegistrationInput["salesperson"],
  };
  const errors: Record<string, string> = {};

  if (value.storeName.length < 2) errors.storeName = "Enter the store name.";
  if (value.contactName.length < 2) errors.contactName = "Enter the primary contact name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "Enter a valid email address.";
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(value.username)) {
    errors.username = "Use 3–40 lowercase letters, numbers, dots, dashes, or underscores.";
  }
  if (value.password.length < 10 || !/[A-Za-z]/.test(value.password) || !/\d/.test(value.password)) {
    errors.password = "Use at least 10 characters with a letter and number.";
  }
  if (value.password !== value.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  if (!["parker", "matt", "beau"].includes(value.salesperson)) errors.salesperson = "Select your salesperson.";
  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function validateLogin(input: { username?: unknown; password?: unknown }): ValidationResult<{ username: string; password: string }> {
  const value = { username: normalizeUsername(input.username), password: String(input.password ?? "") };
  const errors: Record<string, string> = {};
  if (!value.username || !value.password) errors.credentials = "Enter your username and password.";
  return { ok: Object.keys(errors).length === 0, value, errors };
}

function clean(value: unknown, maximum: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}
