/** "1 credit", "60 credits". */
export function creditWord(count: number): string {
  return `${count} credit${count === 1 ? "" : "s"}`;
}
