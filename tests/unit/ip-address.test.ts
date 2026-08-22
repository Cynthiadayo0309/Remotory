import { describe, expect, it } from "vitest";

import {
  isIpAddress,
  isPublicIpAddress,
  isPublicIpv4,
  isPublicIpv6,
} from "@/server/fetch/ip-address";

describe("IP address safety", () => {
  it.each([
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "192.168.1.1",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
  ])("blocks non-public IPv4 %s", (address) => {
    expect(isPublicIpv4(address)).toBe(false);
  });

  it.each(["1.1.1.1", "8.8.8.8", "93.184.216.34"])(
    "allows public IPv4 %s",
    (address) => {
      expect(isPublicIpv4(address)).toBe(true);
    },
  );

  it.each([
    "::",
    "::1",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "ff02::1",
    "2001:2::1",
    "2001:10::1",
    "2001:db8::1",
    "3fff::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.1.1",
  ])("blocks non-public IPv6 %s", (address) => {
    expect(isPublicIpv6(address)).toBe(false);
  });

  it.each(["2606:4700:4700::1111", "2001:4860:4860::8888"])(
    "allows public IPv6 %s",
    (address) => {
      expect(isPublicIpv6(address)).toBe(true);
    },
  );

  it("recognizes address syntax and rejects malformed values", () => {
    expect(isIpAddress("127.0.0.1")).toBe(true);
    expect(isIpAddress("::1")).toBe(true);
    expect(isIpAddress("not-an-ip")).toBe(false);
    expect(isPublicIpAddress("999.1.1.1")).toBe(false);
  });
});
