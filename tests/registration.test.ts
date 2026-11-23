import { expect, test, vi } from "vitest";

// Nothing in this file imports the package at the top level: that import is what is under test.
test("Rigby is not registered until the package is imported", async () => {
    vi.resetModules();
    const { RegisteredCanvasComponents } = await import("@drincs/pixi-vn");
    expect(RegisteredCanvasComponents.get("Rigby")).toBeUndefined();
    await import("@/index");
    expect(RegisteredCanvasComponents.get("Rigby")).toBeDefined();
});
