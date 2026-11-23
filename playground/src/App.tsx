import { canvas } from "@drincs/pixi-vn";
import { Rigby } from "@drincs/pixi-vn-rigby2d";
import { useCallback, useEffect, useRef, useState } from "react";

type Example = {
    id: string;
    title: string;
    description: string;
    skeleton: string;
    atlas: string;
    /** Animation played when the example opens. */
    animation: string;
    /** Height, in canvas pixels, the character is scaled to. */
    height: number;
};

const EXAMPLES: Example[] = [
    {
        id: "mecha",
        title: "Mecha (Spine-like)",
        description:
            "DragonBones “mecha_1502b” converted to a Spine JSON skeleton (see scripts/convert-dragonbones.mjs): rigid bones, IK legs and slot animation. Weapons and flames are nested armatures and are not converted.",
        skeleton: "/mecha/mecha.json",
        atlas: "/mecha/mecha.atlas",
        animation: "idle",
        height: 480,
    },
    {
        id: "nila",
        title: "Nila (Live2D-like)",
        description:
            "Spine 4.3 binary (.skel) character built for a Live2D-style puppet: layered face parts, eyes, brows and hair that you can combine on separate tracks.",
        skeleton: "/nila/nila.skel",
        atlas: "/nila/nila.atlas",
        animation: "idle",
        height: 820,
    },
];

const KEY = "character";

export default function App() {
    const [example, setExample] = useState(EXAMPLES[0]);
    const [status, setStatus] = useState("loading…");
    const [animations, setAnimations] = useState<string[]>([]);
    const [skins, setSkins] = useState<string[]>([]);
    const [loop, setLoop] = useState(true);
    const [overlay, setOverlay] = useState(false);
    const [timeScale, setTimeScale] = useState(1);
    const rigby = useRef<Rigby | null>(null);

    const get = () => rigby.current;

    useEffect(() => {
        let cancelled = false;
        setStatus("loading…");
        (async () => {
            try {
                await Rigby.load(example.skeleton, example.atlas);
                if (cancelled) return;
                canvas.remove(KEY);
                const character = new Rigby({
                    skeleton: example.skeleton,
                    atlas: example.atlas,
                    animation: example.animation,
                    loop: true,
                });
                // Scale to the target height and stand centered on the floor, whatever the skeleton's origin is.
                const bounds = character.getLocalBounds();
                const scale = bounds.height > 0 ? example.height / bounds.height : 1;
                character.scale.set(scale);
                character.x = canvas.width / 2 - (bounds.x + bounds.width / 2) * scale;
                character.y = canvas.height - 80 - (bounds.y + bounds.height) * scale;
                canvas.add(KEY, character);
                rigby.current = character;
                // Handy from the browser console: `rigby.boneGlobal("head")`, `rigby.state`, …
                (window as unknown as { rigby?: Rigby }).rigby = character;
                setAnimations(character.animationNames);
                setSkins(character.skinNames);
                setTimeScale(1);
                setStatus(`${character.animationNames.length} animations`);
            } catch (e) {
                console.error(e);
                setStatus(`error: ${(e as Error).message}`);
            }
        })();
        return () => {
            cancelled = true;
            canvas.remove(KEY);
            rigby.current = null;
        };
    }, [example]);

    const play = useCallback(
        (name: string) => {
            const r = rigby.current;
            if (!r) return;
            if (overlay) r.setAnimation(name, { trackIndex: 1, loop });
            else r.setAnimation(name, { loop, mix: 0.2 });
        },
        [loop, overlay],
    );

    return (
        <div style={panel}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {EXAMPLES.map((e) => (
                    <button
                        key={e.id}
                        type="button"
                        style={e.id === example.id ? { ...button, ...active } : button}
                        onClick={() => setExample(e)}
                    >
                        {e.title}
                    </button>
                ))}
            </div>
            <p style={{ margin: "0 0 8px", opacity: 0.8 }}>{example.description}</p>
            <p style={{ margin: "0 0 8px", opacity: 0.6 }}>{status}</p>

            <div style={row}>
                <label>
                    <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> loop
                </label>
                <label title="Play on track 1, on top of the base animation on track 0">
                    <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> overlay (track 1)
                </label>
                <label>
                    speed{" "}
                    <input
                        type="range"
                        min={0}
                        max={3}
                        step={0.1}
                        value={timeScale}
                        onChange={(e) => {
                            const v = Number(e.target.value);
                            setTimeScale(v);
                            const r = get();
                            if (r) r.timeScale = v;
                        }}
                    />{" "}
                    {timeScale.toFixed(1)}×
                </label>
            </div>

            <div style={row}>
                {animations.map((name) => (
                    <button key={name} type="button" style={button} onClick={() => play(name)}>
                        {name}
                    </button>
                ))}
            </div>

            <div style={row}>
                <button
                    type="button"
                    style={button}
                    onClick={() => {
                        const r = get();
                        if (!r || animations.length < 2) return;
                        r.playSequence(
                            animations.slice(0, 3).map((a) => [a, { loop: false }] as [string, { loop: boolean }]),
                            { repeat: Number.POSITIVE_INFINITY },
                        );
                    }}
                >
                    sequence of the first 3
                </button>
                <button type="button" style={button} onClick={() => get()?.clearTrack(1)}>
                    clear track 1
                </button>
                <button type="button" style={button} onClick={() => get()?.clearTracks()}>
                    clear all
                </button>
            </div>

            {skins.length > 1 && (
                <div style={row}>
                    skins:
                    {skins.map((s) => (
                        <button key={s} type="button" style={button} onClick={() => get()?.setSkin(s)}>
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const panel: React.CSSProperties = {
    position: "absolute",
    top: 8,
    left: 8,
    maxWidth: 520,
    padding: 12,
    borderRadius: 8,
    background: "rgba(20,20,28,0.85)",
    color: "#eee",
    font: "13px system-ui, sans-serif",
    pointerEvents: "auto",
};
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center" };
const button: React.CSSProperties = {
    padding: "3px 8px",
    borderRadius: 4,
    border: "1px solid #556",
    background: "#2a2a3a",
    color: "#eee",
    cursor: "pointer",
};
const active: React.CSSProperties = { background: "#4455aa" };
