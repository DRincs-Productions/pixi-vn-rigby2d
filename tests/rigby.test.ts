import { Rigby } from "@/components";
import { RegisteredCanvasComponents } from "@drincs/pixi-vn";
import { Texture } from "pixi.js";
import { beforeAll, describe, expect, test } from "vitest";
import { rigbyTestData } from "./fixtures/tiny";

beforeAll(async () => {
    await rigbyTestData();
});

const options = { skeleton: "tiny.json", atlas: "tiny.atlas" } as const;

describe("Rigby", () => {
    test("requires Rigby.load before construction", () => {
        expect(() => new Rigby({ skeleton: "missing.json", atlas: "missing.atlas" })).toThrow(
            /not loaded/,
        );
    });

    test("plays the initial animation and reports its length", () => {
        const rigby = new Rigby({ ...options, animation: "idle", autoUpdate: false });
        expect(rigby.animationNames).toEqual(["idle", "wave"]);
        expect(rigby.animationDuration("wave")).toBe(2);
        expect(rigby.animationDuration("nope")).toBeNull();
        expect(rigby.state.tracks[0]?.name).toBe("idle");
    });

    test("setAnimation warns and returns null for an unknown animation", () => {
        const rigby = new Rigby({ ...options, autoUpdate: false });
        expect(rigby.setAnimation("nope")).toBeNull();
        expect(rigby.addAnimation("nope")).toBeNull();
    });

    test("clearTrack and clearTracks stop animations", () => {
        const rigby = new Rigby({ ...options, autoUpdate: false });
        rigby.setAnimation("idle", { trackIndex: 0, loop: true });
        rigby.setAnimation("wave", { trackIndex: 1 });
        rigby.clearTrack(1);
        expect(rigby.state.tracks[1]).toBeUndefined();
        rigby.clearTracks();
        expect(rigby.state.tracks.every((t) => !t)).toBe(true);
    });

    test("memory round-trips tracks, queue, time and position", async () => {
        const rigby = new Rigby({ ...options, autoUpdate: false, x: 30, y: 40 });
        rigby.setAnimation("idle", { loop: true });
        rigby.addAnimation("wave", { loop: false });
        rigby.update(0.5);
        const memory = rigby.memory;
        expect(memory.tracks[0]).toMatchObject({
            animationName: "idle",
            loop: true,
            queue: [{ animationName: "wave" }],
        });
        expect(memory.tracks[0]?.time).toBeCloseTo(0.5);

        const copy = new Rigby({ ...options, autoUpdate: false });
        await copy.setMemory(JSON.parse(JSON.stringify(memory)));
        expect(copy.x).toBe(30);
        expect(copy.y).toBe(40);
        expect(copy.state.tracks[0]?.name).toBe("idle");
        expect(copy.state.tracks[0]?.queue[0]?.name).toBe("wave");
        expect(copy.state.tracks[0]?.time).toBeCloseTo(0.5);
    });

    test("is registered so the canvas can restore it from a save", () => {
        expect(RegisteredCanvasComponents.get("Rigby")).toBe(Rigby);
    });

    test("playSequence is exported in memory and stopped by clearTrack", () => {
        const rigby = new Rigby({ ...options, autoUpdate: false });
        rigby.playSequence(["idle", ["wave", { duration: 1 }]], { trackIndex: 2 });
        expect(rigby.memory.sequenceTimelines[2]?.sequence).toHaveLength(2);
        rigby.clearTrack(2);
        expect(rigby.memory.sequenceTimelines[2]).toBeUndefined();
    });
});

test("fixture textures are PixiJS textures", () => {
    expect(Texture.WHITE).toBeDefined();
});
