import type { Rigby } from "@/components";
import { CachedMap } from "@drincs/pixi-vn";

export namespace CompleteOnContinueTracks {
    export const tracks: CachedMap<string, { rigby: Rigby; tracks: number[] }> = new CachedMap({
        cacheSize: 4,
    });
}
