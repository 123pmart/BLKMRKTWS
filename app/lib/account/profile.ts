import type { StoreProfile } from "@/types";

export interface ProfileValidationResult {
  ok: boolean;
  value: StoreProfile;
  errors: Partial<Record<keyof StoreProfile, string>>;
}

export function publicStoreProfile(input: Partial<StoreProfile>): StoreProfile {
  return {
    storeName: clean(input.storeName, 120),
    contactName: clean(input.contactName, 120),
    email: clean(input.email, 180).toLowerCase(),
    phone: clean(input.phone, 40),
    street: clean(input.street, 180),
    city: clean(input.city, 90),
    state: clean(input.state, 30).toUpperCase(),
    zip: clean(input.zip, 20),
  };
}

export function validateStoreProfile(input: Partial<StoreProfile>): ProfileValidationResult {
  const value = publicStoreProfile(input);
  const errors: ProfileValidationResult["errors"] = {};
  if (value.storeName.length < 2) errors.storeName = "Enter the store name.";
  if (value.contactName.length < 2) errors.contactName = "Enter the contact name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) errors.email = "Enter a valid email.";
  if (value.phone.length < 7) errors.phone = "Enter a phone number.";
  if (value.street.length < 3) errors.street = "Enter a street address.";
  if (value.city.length < 2) errors.city = "Enter a city.";
  if (value.state.length < 2) errors.state = "Enter a state.";
  if (value.zip.length < 3) errors.zip = "Enter a ZIP code.";
  return { ok: Object.keys(errors).length === 0, value, errors };
}

function clean(value: unknown, maximum: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}
