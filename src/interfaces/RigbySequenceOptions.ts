import type { AnimationOptionsCommon } from "@drincs/pixi-vn/motion";

type RigbySequenceOptions = Pick<AnimationOptionsCommon, "duration"> & {
    /** Whether the animation loops until another one replaces it. */
    loop?: boolean;
    /** Delay in seconds before the animation starts. */
    delay?: number;
    /** Crossfade in seconds from the previous animation on the track. */
    mix?: number;
};
export default RigbySequenceOptions;
