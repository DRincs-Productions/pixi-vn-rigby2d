import { Rigby } from "@/index";
import { RegisteredCanvasComponents } from "@drincs/pixi-vn";
import { beforeAll, expect, test } from "vitest";
import { rigbyTestData } from "./fixtures/tiny";

beforeAll(async () => {
    await rigbyTestData();
});

test("a saved Rigby is restored through the registered component", async () => {
    const original = new Rigby({
        skeleton: "tiny.json",
        atlas: "tiny.atlas",
        autoUpdate: false,
        x: 5,
    });
    original.setAnimation("wave", { loop: true });
    original.update(0.25);
    const memory = JSON.parse(JSON.stringify(original.memory));

    const restored = await RegisteredCanvasComponents.getInstance(memory.pixivnId, memory);
    expect(restored).toBeInstanceOf(Rigby);
    expect(restored).not.toBe(original);
    expect((restored as Rigby).x).toBe(5);
    expect((restored as Rigby).state.tracks[0]?.name).toBe("wave");
    expect((restored as Rigby).state.tracks[0]?.time).toBeCloseTo(0.25);
});
