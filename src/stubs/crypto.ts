export function randomBytes(size: number): Uint8Array {
  const arr = new Uint8Array(size);
  crypto.getRandomValues(arr);
  return arr;
}

export default {
  randomBytes,
};
