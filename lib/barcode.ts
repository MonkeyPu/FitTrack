/** True when the digits form a valid EAN-13, EAN-8 or UPC-A number (the last digit is a check digit). */
export function validBarcode(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13].includes(code.length)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * The same product can be written with or without leading zeros (a UPC-A is an EAN-13 with a 0 in front, and
 * spreadsheets drop leading zeros), so a scan is looked up under every spelling.
 */
export function barcodeVariants(code: string): string[] {
  const bare = code.replace(/^0+/, "");
  return [...new Set([code, bare, bare.padStart(8, "0"), bare.padStart(12, "0"), bare.padStart(13, "0")])].filter((c) => c.length >= 6);
}
