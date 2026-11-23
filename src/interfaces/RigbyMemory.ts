import type RigbyOptions from "@/interfaces/RigbyOptions";
import type RigbySequenceOptions from "@/interfaces/RigbySequenceOptions";
import type TrackMemory from "@/interfaces/TrackMemory";
import type {
    AdditionalPositionsExtensionProps,
    AnchorExtensionProps,
    CanvasBaseItemMemory,
    ListenerExtensionMemory,
} from "@drincs/pixi-vn";
import type { SequenceOptions } from "motion";
import type { PointData } from "pixi.js";

export default interface RigbyMemory
    extends CanvasBaseItemMemory,
        ListenerExtensionMemory,
        AdditionalPositionsExtensionProps,
        AnchorExtensionProps,
        Omit<RigbyOptions, "scale" | "animation" | "loop" | "skin"> {
    scale?: PointData | number;
    timeScale: number;
    physicsMovement: number;
    roundPixels: boolean;
    autoUpdate: boolean;
    currentSkin: string | null;
    tracks: TrackMemory[];
    sequenceTimelines: {
        [track: number]: {
            sequence: ([string, RigbySequenceOptions] | string)[];
            options: SequenceOptions & { completeOnContinue?: boolean };
        };
    };
}
