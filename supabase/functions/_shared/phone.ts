export function normalizeIndonesianPhone(input: string): string {
  const invalidPhone = () => new Error('Nomor WhatsApp Indonesia tidak valid.');

  if (typeof input !== 'string') throw invalidPhone();

  const compact = input.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) throw invalidPhone();

  let digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;

  if (!/^628[1-9]\d{7,10}$/.test(digits)) throw invalidPhone();
  return `+${digits}`;
}
