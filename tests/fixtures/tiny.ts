import { Rigby } from "@/components";
import { DOMAdapter, Texture } from "pixi.js";

/** A one-bone skeleton with two animations, enough to exercise the component without assets. */
const skeleton = {
    skeleton: { spine: "4.3.0", width: 10, height: 10 },
    bones: [{ name: "root" }],
    slots: [{ name: "box", bone: "root", attachment: "box" }],
    skins: [
        {
            name: "default",
            attachments: { box: { box: { type: "region", width: 10, height: 10 } } },
        },
    ],
    animations: {
        idle: { bones: { root: { rotate: [{ time: 0, value: 0 }, { time: 1, value: 10 }] } } },
        wave: { bones: { root: { rotate: [{ time: 0, value: 0 }, { time: 2, value: 20 }] } } },
    },
};

const atlas = `tiny.png
size: 16, 16
filter: Linear, Linear
box
bounds: 0, 0, 10, 10
`;

let loading: Promise<void> | undefined;

/** Loads the tiny skeleton into {@link Rigby} (no network: files and textures are in memory). */
export function rigbyTestData() {
    loading ??= (async () => {
        // No browser here: shader programs probe a canvas for precision; give them one without WebGL.
        DOMAdapter.set({
            ...DOMAdapter.get(),
            createCanvas: () => ({ getContext: () => null }) as never,
            fetch: async (url) =>
                String(url).endsWith(".atlas")
                    ? new Response(atlas)
                    : new Response(JSON.stringify(skeleton)),
        });
        const { Assets } = await import("pixi.js");
        const load = Assets.load.bind(Assets);
        Assets.load = ((input: unknown) => {
            if (typeof input === "object" && input && "src" in input) return Promise.resolve(Texture.WHITE);
            return load(input as never);
        }) as typeof Assets.load;
        await Rigby.load("tiny.json", "tiny.atlas");
    })();
    return loading;
}
