// Converts the DragonBones "mecha_1502b" armature (ske.json + tex.json) into a Spine 4.x JSON skeleton and
// atlas that Rigby2D can load. Only what the sample uses is supported: bone/slot animation, image displays and
// IK. Nested armatures (weapons, flames) are skipped.
//
// Usage: node scripts/convert-dragonbones.mjs <ske.json> <tex.json> <armature> <out-dir> <out-name>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [skePath, texPath, armatureName, outDir, outName] = process.argv.slice(2);
const ske = JSON.parse(readFileSync(skePath, "utf8"));
const tex = JSON.parse(readFileSync(texPath, "utf8"));
const arm = ske.armature.find((a) => a.name === armatureName);
const fps = arm.frameRate ?? ske.frameRate ?? 24;
const r = (n) => Math.round(n * 1e4) / 1e4;
const sub = new Map(tex.SubTexture.map((s) => [s.name, s]));

// DragonBones is y-down with clockwise angles; Spine is y-up with counter-clockwise angles.
const boneSetup = (t = {}) => {
    const skX = t.skX ?? 0;
    const skY = t.skY ?? 0;
    const out = { x: r(t.x ?? 0), y: r(-(t.y ?? 0)), rotation: r(-skY), shearY: r(skY - skX) };
    if ((t.scX ?? 1) !== 1) out.scaleX = r(t.scX);
    if ((t.scY ?? 1) !== 1) out.scaleY = r(t.scY);
    for (const k of Object.keys(out)) if (out[k] === 0 && k !== "x" && k !== "y") delete out[k];
    if (out.x === 0) delete out.x;
    if (out.y === 0) delete out.y;
    return out;
};

const bones = arm.bone.map((b) => {
    const out = { name: b.name, length: b.length ?? 0, ...boneSetup(b.transform) };
    if (b.parent) out.parent = b.parent;
    const rot = b.inheritRotation !== false;
    const scale = b.inheritScale !== false;
    if (!rot && !scale) out.inherit = "onlyTranslation";
    else if (!rot) out.inherit = "noRotationOrReflection";
    else if (!scale) out.inherit = "noScale";
    return out;
});

const alphaHex = (c = {}) => {
    const a = Math.round(((c.aM ?? 100) / 100) * 255);
    return `ffffff${a.toString(16).padStart(2, "0")}`;
};
const slots = arm.slot.map((s) => {
    const out = { name: s.name, bone: s.parent };
    const color = alphaHex(s.color);
    if (color !== "ffffffff") out.color = color;
    return out;
});

const imageName = (d) => d.name;
const slotSkin = Object.fromEntries((arm.skin[0].slot ?? []).map((s) => [s.name, s.display]));
const regions = new Set();
const attachments = {};
for (const [slotName, displays] of Object.entries(slotSkin)) {
    const slot = {};
    displays.forEach((d, i) => {
        if (d.type !== "image") return; // skip nested armatures
        const st = sub.get(d.name);
        if (!st) return;
        const w = st.frameWidth ?? st.width;
        const h = st.frameHeight ?? st.height;
        const t = boneSetup(d.transform);
        slot[imageName(d)] = { path: d.name, x: t.x ?? 0, y: t.y ?? 0, rotation: t.rotation ?? 0, width: w, height: h, ...(t.scaleX ? { scaleX: t.scaleX } : {}), ...(t.scaleY ? { scaleY: t.scaleY } : {}) };
        regions.add(d.name);
    });
    attachments[slotName] = slot;
}
// Setup attachment: the first image display of each slot.
for (const s of slots) {
    const first = slotSkin[s.name]?.[0];
    if (first?.type === "image" && sub.has(first.name)) s.attachment = first.name;
}

// --- Animations -------------------------------------------------------------------------------------------
const times = (frames) => {
    let t = 0;
    return frames.map((f) => {
        const time = r(t / fps);
        t += f.duration ?? 0;
        return time;
    });
};
// tweenEasing null = stepped; anything else (0, or absent) = linear.
const curve = (f) => (f.tweenEasing === null ? { curve: "stepped" } : {});
const timeline = (frames, make) => {
    if (!frames?.length) return undefined;
    const ts = times(frames);
    return frames.map((f, i) => ({ time: ts[i], ...make(f), ...curve(f) }));
};
const animations = {};
for (const an of arm.animation) {
    const out = { bones: {}, slots: {} };
    for (const b of an.bone ?? []) {
        const tl = {};
        const translate = timeline(b.translateFrame, (f) => ({ x: r(f.x ?? 0), y: r(-(f.y ?? 0)) }));
        const rotate = timeline(b.rotateFrame, (f) => ({ value: r(-(f.rotate ?? 0)) }));
        const scale = timeline(b.scaleFrame, (f) => ({ x: r(f.x ?? 1), y: r(f.y ?? 1) }));
        if (translate) tl.translate = translate;
        if (rotate) tl.rotate = rotate;
        if (scale) tl.scale = scale;
        if (Object.keys(tl).length) out.bones[b.name] = tl;
    }
    for (const s of an.slot ?? []) {
        const tl = {};
        const display = timeline(s.displayFrame, (f) => {
            const index = f.value ?? 0;
            const d = slotSkin[s.name]?.[index];
            return { name: index >= 0 && d?.type === "image" ? d.name : null };
        });
        const color = timeline(s.colorFrame, (f) => ({ color: alphaHex(f.color) }));
        if (display) tl.attachment = display.map(({ curve: _c, ...rest }) => rest);
        if (color) tl.rgba = color;
        if (Object.keys(tl).length) out.slots[s.name] = tl;
    }
    const events = (an.frame ?? []).flatMap((f, i) => (f.events ?? []).map((e) => ({ time: times(an.frame)[i], name: e.name })));
    if (events.length) out.events = events;
    animations[an.name] = out;
}
const eventNames = [...new Set(Object.values(animations).flatMap((a) => (a.events ?? []).map((e) => e.name)))];

const byName = new Map(arm.bone.map((b) => [b.name, b]));
const ik = (arm.ik ?? []).map((c) => {
    const bone = byName.get(c.bone);
    const chain = [bone.parent, bone.name].slice(c.chain === 1 ? 0 : 1);
    return { name: c.name, bones: chain, target: c.target, bendPositive: String(c.bendPositive) === "false" };
});

const skeleton = {
    skeleton: { spine: "4.2.0", fps, width: r(arm.aabb.width), height: r(arm.aabb.height), x: r(arm.aabb.x), y: r(-(arm.aabb.y + arm.aabb.height)) },
    bones,
    slots,
    ...(ik.length ? { ik } : {}),
    skins: [{ name: "default", attachments }],
    ...(eventNames.length ? { events: Object.fromEntries(eventNames.map((n) => [n, {}])) } : {}),
    animations,
};

const atlas = [`${outName}.png`, `size: ${tex.width}, ${tex.height}`, "filter: Linear, Linear"];
for (const name of regions) {
    const st = sub.get(name);
    atlas.push(name, `bounds: ${st.x}, ${st.y}, ${st.width}, ${st.height}`);
    if (st.frameWidth) {
        const offX = -(st.frameX ?? 0);
        const offY = st.frameHeight - st.height + (st.frameY ?? 0);
        atlas.push(`offsets: ${offX}, ${offY}, ${st.frameWidth}, ${st.frameHeight}`);
    }
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${outName}.json`), JSON.stringify(skeleton));
writeFileSync(join(outDir, `${outName}.atlas`), `${atlas.join("\n")}\n`);
console.log(`${Object.keys(animations).length} animations, ${bones.length} bones, ${regions.size} regions`);
