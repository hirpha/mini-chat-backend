export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, '');
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Format as +1 (555) 123-4567
  const cleaned = normalizePhoneNumber(phoneNumber);
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  return cleaned;
}
