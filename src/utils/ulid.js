const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(ms, len) {
  let str = '';
  for (let i = len - 1; i >= 0; i--) {
    str = ENCODING[ms % 32] + str;
    ms = Math.floor(ms / 32);
  }
  return str;
}

function encodeRandom(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => ENCODING[b % 32]).join('');
}

export function ulid() {
  return encodeTime(Date.now(), 10) + encodeRandom(16);
}
