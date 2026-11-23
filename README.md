# Rigby2D integration for Pixi’VN

`@drincs/pixi-vn-rigby2d` is a lightweight wrapper around [`@rigby2d/pixi-js`](https://www.npmjs.com/package/@rigby2d/pixi-js), designed to integrate **Rigby2D** skeletal animations into **Pixi’VN** projects.

It provides the `Rigby` canvas component: a Rigby2D skeleton that behaves like any other Pixi’VN canvas element (positioning with `anchor`, `align` and `percentagePosition`, listeners, `canvas.add`), and that is saved and restored together with the game state.

## Installation

```bash
npm install @drincs/pixi-vn-rigby2d @rigby2d/pixi-js
```

`@drincs/pixi-vn` and `@rigby2d/pixi-js` are peer dependencies: your project installs and controls their versions.

## Example

Export your character from Rigby2D (*File ▸ Export*): the `.skel` or `.json`, the `.atlas` and its `.png` pages, in one folder.

```ts
import { canvas } from "@drincs/pixi-vn";
import { Rigby } from "@drincs/pixi-vn-rigby2d";

// Loads the skeleton, the atlas and the atlas pages (loading the same pair again is free).
await Rigby.load("assets/hero.skel", "assets/hero.atlas");

const hero = new Rigby({
    skeleton: "assets/hero.skel",
    atlas: "assets/hero.atlas",
    animation: "idle",
});
hero.x = canvas.width / 2;
hero.y = canvas.height;

canvas.add("hero", hero);
```

`skeleton` and `atlas` are URLs. A `Rigby` can only be created after `Rigby.load` has finished for the same pair, otherwise the constructor throws.

## Animations

Animations play on numbered tracks, so several can run at once (for example a body animation and a blink).

```ts
// Replace what is playing on track 0, crossfading over 0.2 seconds.
hero.setAnimation("walk", { loop: true, mix: 0.2 });

// Play "wave" on track 1, on top of track 0.
hero.setAnimation("wave", { trackIndex: 1 });

// Queue an animation after the current one on track 0.
hero.addAnimation("idle", { loop: true });

// Play a sequence, one animation after another.
hero.playSequence(["walk", ["wave", { duration: 1 }], ["idle", { loop: true }]]);

hero.clearTrack(1); // stop one track
hero.clearTracks(); // stop everything and go back to the setup pose

hero.setSkin("armor");
```

By default an animation is stopped when the player continues to the next step (`completeOnContinue: true`). Pass `completeOnContinue: false` to keep it playing.

`Rigby` extends `RigbySkeleton` from `@rigby2d/pixi-js`, so everything it offers is available too: `state`, `timeScale`, `boneTransform`, `attachToBone`, the `start`/`end`/`complete`/`event` events, and so on.

## Saving and loading

The component’s state is part of the Pixi’VN game state: position, skin, playback options, the animation on each track (with how far it has played and what is queued) and running sequences. After loading a save, the skeleton continues from where it was.

### Important: register the component in your main file

When this package is imported, it registers `Rigby` with Pixi’VN’s `RegisteredCanvasComponents`, which is what allows the canvas to restore a `Rigby` from a save. The registration is a side effect that runs the first time the module is evaluated, not when `Rigby` is used.

With lazy loading (code-split routes, dynamically imported labels, a save loaded before any scene using `Rigby` has been imported) the registration might not have happened yet, and restoring the save would fail. To avoid this, import the package once, for its side effect, in your app’s entry file:

```ts
import "@drincs/pixi-vn-rigby2d";
```
