const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function encodeBase62(num: number): string {
  if (num === 0) return '0';
  let result = '';
  while (num > 0) {
    result = charset[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

export function decodeBase62(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result = result * 62 + charset.indexOf(str[i]);
  }
  return result;
}
