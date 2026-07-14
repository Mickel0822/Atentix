import { describe, expect, it } from "vitest";
import { normalizeWebSocketBaseUrl } from "./config";

describe("WebSocket URL configuration", () => {
  it("converts HTTPS backend URLs to secure WebSockets", () => {
    expect(
      normalizeWebSocketBaseUrl("https://backend.example.com/", true)
    ).toBe("wss://backend.example.com");
  });

  it("upgrades insecure WebSockets in secure browser contexts", () => {
    expect(normalizeWebSocketBaseUrl("ws://backend.example.com", true)).toBe(
      "wss://backend.example.com"
    );
  });

  it("keeps local WebSockets available during development", () => {
    expect(normalizeWebSocketBaseUrl("http://localhost:8000", false)).toBe(
      "ws://localhost:8000"
    );
  });
});
