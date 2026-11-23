import { CompleteOnContinueTracks } from "@/memory/CompleteOnContinueTracks";
import { Game } from "@drincs/pixi-vn";

export * from "@/components";
export type { RigbyMemory, RigbyOptions, RigbySequenceOptions, TrackMemory } from "@/interfaces";

Game.addOnPreContinue(() => {
    // Stop the animations flagged `completeOnContinue` when the player continues, so the next step
    // never starts with one of them still playing.
    CompleteOnContinueTracks.tracks.values().forEach(({ tracks, rigby }) => {
        tracks.forEach((t) => {
            rigby.clearTrack(t);
        });
    });
    CompleteOnContinueTracks.tracks.clear();
});
