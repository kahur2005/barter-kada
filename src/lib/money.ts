export function formatRupiah(value: string): string {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error('Nominal rupiah harus bilangan bulat positif atau nol.');
  return `Rp${BigInt(value).toLocaleString('id-ID')}`;
}
