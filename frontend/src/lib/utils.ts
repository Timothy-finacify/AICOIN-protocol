export function stringToBytes32(str: string): string {
  const hex = str.slice(0, 2) === "0x" ? str.slice(2) : Buffer.from(str).toString("hex");
  return "0x" + hex.padEnd(64, "0").slice(0, 64);
}