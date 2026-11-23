export default interface TrackMemory {
    trackIndex: number;
    animationName: string;
    loop: boolean;
    /** Seconds already played, so the animation resumes where it was. */
    time: number;
    /** Crossfade in seconds used when it started. */
    mix: number;
    /** Animations queued after this one on the same track. */
    queue: { animationName: string; loop: boolean; mix: number; delay: number | null }[];
}
