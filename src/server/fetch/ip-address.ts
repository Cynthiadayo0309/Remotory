const IPV4_PART = /^\d{1,3}$/;
const IPV6_PART = /^[0-9a-f]{1,4}$/i;

export function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !IPV4_PART.test(part))) {
    return null;
  }
  const numbers = parts.map(Number);
  return numbers.every((part) => part >= 0 && part <= 255) ? numbers : null;
}

function expandIpv6(value: string): number[] | null {
  let address = value.toLowerCase();
  if (address.startsWith("[") && address.endsWith("]")) {
    address = address.slice(1, -1);
  }
  if (address.includes("%")) return null;

  const ipv4Tail = address.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  let ipv4Groups: string[] = [];
  if (ipv4Tail) {
    const ipv4 = parseIpv4(ipv4Tail);
    if (!ipv4) return null;
    ipv4Groups = [
      ((ipv4[0]! << 8) | ipv4[1]!).toString(16),
      ((ipv4[2]! << 8) | ipv4[3]!).toString(16),
    ];
    address = address.slice(0, -ipv4Tail.length) + ipv4Groups.join(":");
  }

  const halves = address.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  if (
    [...left, ...right].some((part) => !IPV6_PART.test(part)) ||
    (halves.length === 1 && left.length !== 8)
  ) {
    return null;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 2 && missing < 1)) return null;
  return [...left, ...Array(missing).fill("0"), ...right].map((part) =>
    Number.parseInt(part, 16),
  );
}

function inIpv4Range(parts: number[], prefix: number[], bits: number): boolean {
  const fullBytes = Math.floor(bits / 8);
  const remainingBits = bits % 8;
  for (let index = 0; index < fullBytes; index += 1) {
    if (parts[index] !== prefix[index]) return false;
  }
  if (remainingBits === 0) return true;
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (parts[fullBytes]! & mask) === (prefix[fullBytes]! & mask);
}

export function isPublicIpv4(value: string): boolean {
  const parts = parseIpv4(value);
  if (!parts) return false;
  const blocked: Array<[number[], number]> = [
    [[0, 0, 0, 0], 8],
    [[10, 0, 0, 0], 8],
    [[100, 64, 0, 0], 10],
    [[127, 0, 0, 0], 8],
    [[169, 254, 0, 0], 16],
    [[172, 16, 0, 0], 12],
    [[192, 0, 0, 0], 24],
    [[192, 0, 2, 0], 24],
    [[192, 88, 99, 0], 24],
    [[192, 168, 0, 0], 16],
    [[198, 18, 0, 0], 15],
    [[198, 51, 100, 0], 24],
    [[203, 0, 113, 0], 24],
    [[224, 0, 0, 0], 4],
    [[240, 0, 0, 0], 4],
  ];
  return !blocked.some(([prefix, bits]) => inIpv4Range(parts, prefix, bits));
}

export function isPublicIpv6(value: string): boolean {
  const groups = expandIpv6(value);
  if (!groups) return false;

  const isMappedIpv4 =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (isMappedIpv4) {
    return isPublicIpv4(
      [
        groups[6]! >> 8,
        groups[6]! & 0xff,
        groups[7]! >> 8,
        groups[7]! & 0xff,
      ].join("."),
    );
  }

  const isGlobalUnicast = (groups[0]! & 0xe000) === 0x2000;
  const isSpecialProtocolRange = groups[0] === 0x2001 && groups[1]! <= 0x01ff;
  const isDocumentation = groups[0] === 0x2001 && groups[1] === 0x0db8;
  const isDocumentation3fff =
    groups[0] === 0x3fff && (groups[1]! & 0xfff0) === 0;
  return (
    isGlobalUnicast &&
    !isSpecialProtocolRange &&
    !isDocumentation &&
    !isDocumentation3fff
  );
}

export function isIpAddress(value: string): boolean {
  return parseIpv4(value) !== null || expandIpv6(value) !== null;
}

export function isPublicIpAddress(value: string): boolean {
  return isPublicIpv4(value) || isPublicIpv6(value);
}
