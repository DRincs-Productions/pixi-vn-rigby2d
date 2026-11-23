import type { ContainerOptions } from "@drincs/pixi-vn";
import type { RigbySkeletonOptions } from "@rigby2d/pixi-js";

export default interface RigbyOptions
    extends Omit<RigbySkeletonOptions, "ticker" | "label" | "skin">,
        Omit<ContainerOptions, "scale" | "label"> {
    /**
     * URL of the skeleton file (`.skel` or `.json`). It must have been loaded with
     * {@link Rigby.load} (together with `atlas`) before the component is created.
     */
    skeleton: string;
    /** URL of the `.atlas` file. Its pages are loaded from the atlas's folder. */
    atlas: string;
    /** The skin to use (`null`: the default skin). */
    skin?: string | null;
    /** The container's label. */
    label?: string;
    /** Scale of the skeleton (a number applies to both axes). */
    scale?: ContainerOptions["scale"];
}
