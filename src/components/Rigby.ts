import type { RigbyMemory, RigbyOptions, RigbySequenceOptions } from "@/interfaces";
import { CompleteOnContinueTracks } from "@/memory/CompleteOnContinueTracks";
import { logger } from "@/utils/log-utility";
import { getSuperPivot } from "@/utils/props-utility";
import {
    type AdditionalPositionsExtension,
    addListenerHandler,
    analizePositionsExtensionProps,
    type AnchorExtension,
    type CanvasBaseItem,
    createExportableElement,
    type ListenerExtension,
    type OnEventsHandlers,
    CanvasPropertyUtility as PropsUtils,
    RegisteredCanvasComponents,
    setMemoryContainer,
} from "@drincs/pixi-vn";
import { type SegmentOptions, timeline } from "@drincs/pixi-vn/motion";
import { type RigbyData, rigbyPixi } from "@drincs/pixi-vn-rigby2d/core";
import type { AnimationPlaybackControlsWithThen, SequenceOptions } from "motion";
import * as PIXI from "pixi.js";
import type {
    ContainerChild,
    ContainerEvents,
    EventEmitter,
    ObservablePoint,
    PointData,
} from "pixi.js";

const CANVAS_RIGBY_ID = "Rigby";

/** The Rigby2D runtime, created for the PixiJS instance Pixi’VN renders with. */
const runtime = rigbyPixi(PIXI as unknown as Parameters<typeof rigbyPixi>[0]);
const CoreRigby = runtime.RigbySkeleton;

const loadedData = new Map<string, RigbyData>();
const dataKey = (skeleton: string, atlas: string) => `${skeleton}\n${atlas}`;

type TrackOptions = {
    /** The track to play the animation on. */
    trackIndex?: number;
    /** Whether the animation loops until another one replaces it. */
    loop?: boolean;
    /** Crossfade in seconds from the previous animation on the track. */
    mix?: number;
    /**
     * If true, the animation is stopped when the player continues to the next step.
     * @default true
     */
    completeOnContinue?: boolean;
};

/**
 * Rigby2D skeleton component for Pixi’VN: plays skeletal animations exported from the Rigby2D editor,
 * with the position, anchor, listener and save/load features of the other Pixi’VN canvas components.
 * @example
 * ```ts
 * import { canvas } from "@drincs/pixi-vn";
 * import { Rigby } from "@drincs/pixi-vn-rigby2d";
 *
 * await Rigby.load("assets/hero.skel", "assets/hero.atlas");
 *
 * const hero = new Rigby({
 *     skeleton: "assets/hero.skel",
 *     atlas: "assets/hero.atlas",
 *     animation: "idle",
 * });
 * hero.x = canvas.width / 2;
 * hero.y = canvas.height;
 *
 * canvas.add("hero", hero);
 * ```
 */
export default class Rigby
    extends CoreRigby
    implements
        CanvasBaseItem<RigbyMemory>,
        AnchorExtension,
        ListenerExtension,
        AdditionalPositionsExtension
{
    /**
     * Loads a skeleton, its atlas and the atlas pages. Call it (and wait for it) before creating a
     * {@link Rigby} with the same `skeleton` and `atlas`. Loading the same pair again is free.
     * @param skeleton URL of the `.skel` or `.json` file.
     * @param atlas URL of the `.atlas` file.
     */
    static async load(skeleton: string, atlas: string): Promise<RigbyData> {
        const data = await runtime.loadRigby(skeleton, atlas);
        loadedData.set(dataKey(skeleton, atlas), data);
        return data;
    }

    /**
     * @param options The skeleton and atlas URLs (loaded with {@link Rigby.load}), the initial skin and
     * animation, playback options, plus the standard {@link CanvasBaseItem} container options (anchor,
     * align, percentagePosition, etc.).
     */
    constructor(options: RigbyOptions) {
        const {
            skeleton,
            atlas,
            skin,
            animation,
            loop,
            timeScale,
            autoUpdate,
            physicsMovement,
            roundPixels,
            label,
            ...containerOptions
        } = options;
        const data = loadedData.get(dataKey(skeleton, atlas));
        if (!data) {
            throw new Error(
                `Rigby2D: "${skeleton}" and "${atlas}" are not loaded. Call "await Rigby.load(skeleton, atlas)" first.`,
            );
        }
        const { anchor, align, percentagePosition, ...restOptions } =
            analizePositionsExtensionProps(containerOptions) || {};
        super(data, {
            animation,
            loop,
            skin,
            timeScale,
            autoUpdate,
            physicsMovement,
            roundPixels,
            label,
        });
        this.skeletonUrl = skeleton;
        this.atlasUrl = atlas;
        Object.assign(this, restOptions);
        if (anchor) {
            this.anchor = anchor;
        }
        if (align) {
            this.align = align;
        }
        if (percentagePosition) {
            this.percentagePosition = percentagePosition;
        }
    }
    readonly pixivnId: string = CANVAS_RIGBY_ID;
    /** The skeleton URL this component was created with. */
    readonly skeletonUrl: string;
    /** The atlas URL this component was created with. */
    readonly atlasUrl: string;
    /**
     * Tracks the running {@link playSequence} timelines, keyed by track index, so they can be
     * stopped ({@link clearTrack}, {@link clearTracks}) or serialized ({@link memory}).
     */
    private sequenceTimelines: {
        [track: number]: {
            sequence: ([string, RigbySequenceOptions] | string)[];
            options: SequenceOptions & { completeOnContinue?: boolean };
            timeline: AnimationPlaybackControlsWithThen;
        };
    } = {};
    get memory(): RigbyMemory {
        return {
            pixivnId: CANVAS_RIGBY_ID,
            // container properties
            isRenderGroup: this.isRenderGroup,
            blendMode: this.blendMode,
            tint: this.tint,
            alpha: this.alpha,
            angle: this.angle,
            renderable: this.renderable,
            rotation: this.rotation,
            scale: { x: this.scale.x, y: this.scale.y },
            pivot: { x: this.pivot.x, y: this.pivot.y },
            position: { x: this.position.x, y: this.position.y },
            skew: { x: this.skew.x, y: this.skew.y },
            visible: this.visible,
            x: this.x,
            y: this.y,
            cursor: this.cursor,
            eventMode: this.eventMode,
            interactive: this.interactive,
            interactiveChildren: this.interactiveChildren,
            height: this.height,
            width: this.width,
            // additional positions and anchor
            anchor: this._anchor ? this.anchor : undefined,
            align: this._align,
            percentagePosition: this._percentagePosition,
            // container extras
            accessible: this.accessible,
            accessibleChildren: this.accessibleChildren,
            accessibleHint: this.accessibleHint,
            accessiblePointerEvents: this.accessiblePointerEvents,
            accessibleText: this.accessibleText,
            accessibleTitle: this.accessibleTitle,
            accessibleType: this.accessibleType,
            cullable: this.cullable,
            cullableChildren: this.cullableChildren,
            label: this.label,
            origin: { x: this.origin.x, y: this.origin.y },
            sortableChildren: this.sortableChildren,
            zIndex: this.zIndex,
            sortDirty: this.sortDirty,
            tabIndex: this.tabIndex,
            // rigby properties
            skeleton: this.skeletonUrl,
            atlas: this.atlasUrl,
            timeScale: this.timeScale,
            physicsMovement: this.physicsMovement,
            roundPixels: this.roundPixels,
            autoUpdate: this.autoUpdate,
            currentSkin: this.skin,
            tracks: this.snapshotTracks(),
            sequenceTimelines: Object.fromEntries(
                Object.entries(this.sequenceTimelines).map(
                    ([trackIndex, { sequence, options }]) => [trackIndex, { sequence, options }],
                ),
            ),
        };
    }
    async setMemory(memory: RigbyMemory): Promise<void> {
        await setMemoryRigby(this, memory);
        this.reloadAnchor();
        this.reloadPosition();
    }

    private flagCompleteOnContinue(trackIndex: number, completeOnContinue: boolean) {
        const mem = CompleteOnContinueTracks.tracks.get(`${this.uid}`) || {
            rigby: this,
            tracks: [],
        };
        if (completeOnContinue && !mem.tracks.includes(trackIndex)) {
            mem.tracks.push(trackIndex);
            CompleteOnContinueTracks.tracks.set(`${this.uid}`, mem);
        } else if (!completeOnContinue && mem.tracks.includes(trackIndex)) {
            mem.tracks = mem.tracks.filter((index) => index !== trackIndex);
        }
    }
    /**
     * Sets the current animation on a track, replacing whatever is playing on it. Use
     * {@link addAnimation} instead to queue an animation after the current one.
     * @param animationName The name of the animation.
     * @param options Track, loop, crossfade and `completeOnContinue` options.
     * @returns The track entry, or `null` if the animation does not exist (a warning is logged).
     */
    setAnimation(animationName: string, options: TrackOptions = {}) {
        const { trackIndex = 0, loop = false, mix, completeOnContinue = true } = options;
        if (!this.hasAnimation(animationName)) {
            logger.warn(`Animation ${animationName} not found in skeleton ${this.skeletonUrl}`);
            return null;
        }
        this.flagCompleteOnContinue(trackIndex, completeOnContinue);
        return this.play(animationName, loop, mix, trackIndex);
    }
    /**
     * Queues an animation to play on a track after the current one ends. Use {@link setAnimation}
     * instead to replace the track's current animation immediately.
     * @param animationName The name of the animation.
     * @param options Track, loop, crossfade, delay and `completeOnContinue` options.
     * @returns The queued entry, or `null` if the animation does not exist (a warning is logged).
     */
    addAnimation(
        animationName: string,
        options: TrackOptions & {
            /**
             * Seconds after the previous animation started. If not provided, it starts when the
             * previous animation ends.
             */
            delay?: number;
        } = {},
    ) {
        const { trackIndex = 0, loop = false, mix, delay, completeOnContinue = true } = options;
        if (!this.hasAnimation(animationName)) {
            logger.warn(`Animation ${animationName} not found in skeleton ${this.skeletonUrl}`);
            return null;
        }
        this.flagCompleteOnContinue(trackIndex, completeOnContinue);
        return this.queue(animationName, loop, mix, trackIndex, delay ?? null);
    }
    /**
     * Plays a sequence of animations on a track, one after another, driven by a `motion` timeline. Any
     * animation on the track is cleared first. The sequence is tracked until it completes, at which
     * point the track is cleared automatically, and it is included in {@link memory}.
     * @param sequence The animations to play, with their options. See https://motion.dev/docs/animate#timeline-sequences
     * @param options Timeline options, plus `trackIndex` and `completeOnContinue`.
     * @returns The `motion` timeline controls (without `pause`, since pausing is not supported).
     * @example
     * ```ts
     * hero.playSequence([
     *     ["walk", { loop: true, duration: 2 }],
     *     ["jump", { delay: 0.5 }],
     * ], { loop: true });
     * ```
     */
    playSequence(
        sequence: ([string, RigbySequenceOptions] | string)[],
        options: SequenceOptions & {
            /**
             * If true, the animation is stopped when the player continues to the next step.
             * @default true
             */
            completeOnContinue?: boolean;
            /** The track to play the animation on. */
            trackIndex?: number;
        } = {},
    ): Omit<AnimationPlaybackControlsWithThen, "pause"> {
        try {
            sequence = createExportableElement(sequence);
        } catch (e) {
            logger.error("Failed to create exportable element for sequence", e);
            throw e;
        }
        try {
            options = createExportableElement(options);
        } catch (e) {
            logger.error("Failed to create exportable element for options", e);
            throw e;
        }
        const { trackIndex = this.state.tracks.length, completeOnContinue = true } = options;
        this.clearTrack(trackIndex);
        const timelineControls = this.setTrackSequence(sequence, {
            ...options,
            trackIndex,
            completeOnContinue,
        });
        timelineControls.then(() => this.clearTrack(trackIndex));
        this.sequenceTimelines[trackIndex] = { sequence, options, timeline: timelineControls };
        return timelineControls;
    }
    /**
     * Builds and starts the `motion` timeline backing {@link playSequence}: each entry becomes a segment
     * whose `onPlay` plays the animation, lasting the animation's own length unless `duration` is given.
     * Entries whose animation is not found are skipped (with a warning).
     */
    private setTrackSequence(
        sequence: ([string, RigbySequenceOptions] | string)[],
        options: SequenceOptions & { completeOnContinue: boolean; trackIndex: number },
    ) {
        const { completeOnContinue, trackIndex, ...rest } = options;
        const results: SegmentOptions[] = [];
        sequence.forEach((item) => {
            if (typeof item === "string") {
                item = [item, {}];
            }
            const [animationName, animOptions] = item;
            if (!this.hasAnimation(animationName)) {
                logger.warn(`Animation ${animationName} not found in skeleton ${this.skeletonUrl}`);
                return;
            }
            const {
                loop,
                mix,
                delay,
                duration = this.animationDuration(animationName) ?? undefined,
                ...others
            } = animOptions || {};
            results.push({
                ...others,
                delay,
                duration,
                onPlay: () =>
                    this.setAnimation(animationName, {
                        loop,
                        mix,
                        trackIndex,
                        completeOnContinue,
                    }),
            });
        });
        return timeline(results, { ...rest });
    }
    /**
     * Stops every animation, including any running {@link playSequence} timeline, and returns the
     * skeleton to its setup pose.
     */
    clearTracks() {
        Object.values(this.sequenceTimelines).forEach(({ timeline }) => {
            timeline.stop();
        });
        this.sequenceTimelines = {};
        this.stop();
    }
    /**
     * Removes the animations of a single track, stopping its running {@link playSequence} timeline (if
     * any).
     * @param trackIndex The track to clear.
     */
    clearTrack(trackIndex: number) {
        this.sequenceTimelines[trackIndex]?.timeline.stop();
        delete this.sequenceTimelines[trackIndex];
        this.state.clearTrack(trackIndex);
    }
    /**
     * Sets the skin. An unknown skin is logged via {@link logger.error} rather than thrown.
     * @param skinName The name of the skin (`null`: the default skin).
     */
    override setSkin(skinName: string | null): this {
        try {
            return super.setSkin(skinName);
        } catch (e) {
            logger.error(`Failed to set skin: ${skinName}`, e);
            return this;
        }
    }

    /** ListenerExtension */
    /**
     * The registered event handlers for this component, used by {@link setMemory}/{@link memory} to
     * persist and restore listeners added via {@link on}.
     */
    readonly onEventsHandlers: OnEventsHandlers = {};
    override on<
        T extends
            | keyof ContainerEvents<ContainerChild>
            | keyof { [K: symbol]: any; [K: {} & string]: any },
    >(
        event: T,
        fn: (
            ...args: [
                ...EventEmitter.ArgumentMap<
                    ContainerEvents<ContainerChild> & { [K: symbol]: any; [K: {} & string]: any }
                >[Extract<
                    T,
                    | keyof ContainerEvents<ContainerChild>
                    | keyof { [K: symbol]: any; [K: {} & string]: any }
                >],
                typeof this,
            ]
        ) => void,
        context?: any,
    ): this {
        addListenerHandler(event, this, fn);

        return super.on<T>(event, (...e) => fn(...e, this), context);
    }

    /** Anchor */
    private _anchor?: PointData;
    get anchor(): PointData {
        const x = super.pivot.x / this.width;
        const y = super.pivot.y / this.height;
        return { x, y };
    }
    set anchor(value: PointData | number) {
        if (typeof value === "number") {
            this._anchor = { x: value, y: value };
        } else {
            this._anchor = value;
        }
        this.reloadAnchor();
    }
    protected reloadAnchor() {
        if (this._anchor) {
            super.pivot.set(this._anchor.x * this.width, this._anchor.y * this.height);
        }
    }
    override get pivot() {
        return super.pivot;
    }
    override set pivot(value: ObservablePoint) {
        this._anchor = undefined;
        super.pivot = value;
    }

    /** AdditionalPositions */
    private _align: Partial<PointData> | undefined = undefined;
    set align(value: Partial<PointData> | number) {
        this._percentagePosition = undefined;
        if (this._align === undefined) this._align = {};
        if (typeof value === "number") {
            this._align.x = value;
            this._align.y = value;
        } else {
            if (value.x !== undefined) this._align.x = value.x;
            if (value.y !== undefined) this._align.y = value.y;
        }
        this.reloadPosition();
    }
    get align() {
        const superPivot = getSuperPivot(this);
        const superScale = PropsUtils.getSuperPoint(this.scale, this.angle);
        return {
            x: PropsUtils.calculateAlignByPosition(
                "width",
                this.x,
                PropsUtils.getSuperWidth(this),
                superPivot.x,
                superScale.x < 0,
                this.anchor.x,
            ),
            y: PropsUtils.calculateAlignByPosition(
                "height",
                this.y,
                PropsUtils.getSuperHeight(this),
                superPivot.y,
                superScale.y < 0,
                this.anchor.y,
            ),
        };
    }
    set xAlign(value: number) {
        if (this._percentagePosition) {
            this._percentagePosition = undefined;
        }
        if (this._align === undefined) this._align = {};
        this._align.x = value;
        this.reloadPosition();
    }
    get xAlign() {
        const superPivot = getSuperPivot(this);
        const superScale = PropsUtils.getSuperPoint(this.scale, this.angle);
        return PropsUtils.calculateAlignByPosition(
            "width",
            this.x,
            PropsUtils.getSuperWidth(this),
            superPivot.x,
            superScale.x < 0,
            this.anchor.x,
        );
    }
    set yAlign(value: number) {
        if (this._percentagePosition) {
            this._percentagePosition = undefined;
        }
        if (this._align === undefined) this._align = {};
        this._align.y = value;
        this.reloadPosition();
    }
    get yAlign() {
        const superPivot = getSuperPivot(this);
        const superScale = PropsUtils.getSuperPoint(this.scale, this.angle);
        return PropsUtils.calculateAlignByPosition(
            "height",
            this.y,
            PropsUtils.getSuperHeight(this),
            superPivot.y,
            superScale.y < 0,
            this.anchor.y,
        );
    }
    private _percentagePosition: Partial<PointData> | undefined = undefined;
    set percentagePosition(value: Partial<PointData> | number) {
        this._align = undefined;
        if (this._percentagePosition === undefined) this._percentagePosition = {};
        if (typeof value === "number") {
            this._percentagePosition.x = value;
            this._percentagePosition.y = value;
        } else {
            if (value.x !== undefined) this._percentagePosition.x = value.x;
            if (value.y !== undefined) this._percentagePosition.y = value.y;
        }
        this.reloadPosition();
    }
    get percentagePosition() {
        return {
            x: PropsUtils.calculatePercentagePositionByPosition("width", this.x),
            y: PropsUtils.calculatePercentagePositionByPosition("height", this.y),
        };
    }
    set percentageX(_value: number) {
        if (this._align) {
            this._align = undefined;
        }
        if (this._percentagePosition === undefined) this._percentagePosition = {};
        this._percentagePosition.x = _value;
        this.reloadPosition();
    }
    get percentageX() {
        return PropsUtils.calculatePercentagePositionByPosition("width", this.x);
    }
    set percentageY(_value: number) {
        if (this._align) {
            this._align = undefined;
        }
        if (this._percentagePosition === undefined) this._percentagePosition = {};
        this._percentagePosition.y = _value;
        this.reloadPosition();
    }
    get percentageY() {
        return PropsUtils.calculatePercentagePositionByPosition("height", this.y);
    }
    get positionType(): "pixel" | "percentage" | "align" {
        if (this._align) {
            return "align";
        } else if (this._percentagePosition) {
            return "percentage";
        }
        return "pixel";
    }
    get positionInfo(): { x: number; y: number; type: "pixel" | "percentage" | "align" } {
        if (this._align) {
            return { x: this._align.x || 0, y: this._align.y || 0, type: "align" };
        } else if (this._percentagePosition) {
            return {
                x: this._percentagePosition.x || 0,
                y: this._percentagePosition.y || 0,
                type: "percentage",
            };
        }
        return { x: this.x, y: this.y, type: "pixel" };
    }
    set positionInfo(value: { x: number; y: number; type?: "pixel" | "percentage" | "align" }) {
        if (value.type === "align") {
            this.align = { x: value.x, y: value.y };
        } else if (value.type === "percentage") {
            this.percentagePosition = { x: value.x, y: value.y };
        } else {
            this.position.set(value.x, value.y);
        }
    }
    /**
     * Re-applies whichever positioning mode is active ({@link align} or {@link percentagePosition}) onto
     * the underlying pixel {@link x}/{@link y}, e.g. after the skeleton's size, scale or angle changes.
     * No-op when neither mode is set (plain pixel positioning).
     */
    protected reloadPosition() {
        if (this._align) {
            const superPivot = getSuperPivot(this);
            const superScale = PropsUtils.getSuperPoint(this.scale, this.angle);
            if (this._align.x !== undefined) {
                super.x = PropsUtils.calculatePositionByAlign(
                    "width",
                    this._align.x,
                    PropsUtils.getSuperWidth(this),
                    superPivot.x,
                    superScale.x < 0,
                );
            }
            if (this._align.y !== undefined) {
                super.y = PropsUtils.calculatePositionByAlign(
                    "height",
                    this._align.y,
                    PropsUtils.getSuperHeight(this),
                    superPivot.y,
                    superScale.y < 0,
                );
            }
        } else if (this._percentagePosition) {
            if (this._percentagePosition.x !== undefined) {
                super.x = PropsUtils.calculatePositionByPercentagePosition(
                    "width",
                    this._percentagePosition.x,
                );
            }
            if (this._percentagePosition.y !== undefined) {
                super.y = PropsUtils.calculatePositionByPercentagePosition(
                    "height",
                    this._percentagePosition.y,
                );
            }
        }
    }
    get position(): ObservablePoint {
        return super.position;
    }
    set position(value: ObservablePoint) {
        this._align = undefined;
        this._percentagePosition = undefined;
        super.position = value;
    }
    get x(): number {
        return super.x;
    }
    set x(value: number) {
        this._align = undefined;
        this._percentagePosition = undefined;
        super.x = value;
    }
    override get y(): number {
        return super.y;
    }
    override set y(value: number) {
        this._align = undefined;
        this._percentagePosition = undefined;
        super.y = value;
    }
}
/**
 * Registers {@link Rigby} under {@link CANVAS_RIGBY_ID} so it can be restored from a {@link RigbyMemory}
 * snapshot: loads the skeleton and atlas, constructs the component, then applies the rest of the memory.
 */
RegisteredCanvasComponents.add<RigbyMemory, typeof Rigby>(Rigby, {
    name: CANVAS_RIGBY_ID,
    getInstance: async (canvasClass, memory) => {
        await canvasClass.load(memory.skeleton, memory.atlas);
        const instance = new canvasClass({
            skeleton: memory.skeleton,
            atlas: memory.atlas,
        });
        await instance.setMemory(memory);
        return instance;
    },
});

/**
 * Applies a {@link RigbyMemory} snapshot onto an existing {@link Rigby}: stops all animations, restores
 * the skin and playback settings, delegates the common container/anchor/position properties to
 * {@link setMemoryContainer}, then replays the sequence timelines and the remaining animation tracks
 * from where they were.
 * @see {@link Rigby.setMemory}
 */
async function setMemoryRigby(element: Rigby, param: RigbyMemory) {
    const memory = analizePositionsExtensionProps(param);
    element.clearTracks();
    if (!memory) return;
    memory.currentSkin !== undefined && element.setSkin(memory.currentSkin);
    if (memory.timeScale !== undefined) element.timeScale = memory.timeScale;
    if (memory.physicsMovement !== undefined) element.physicsMovement = memory.physicsMovement;
    if (memory.roundPixels !== undefined) element.roundPixels = memory.roundPixels;
    await setMemoryContainer(element, memory, {
        end() {
            if (memory.accessible !== undefined) element.accessible = memory.accessible;
            if (memory.accessibleChildren !== undefined)
                element.accessibleChildren = memory.accessibleChildren;
            if (memory.accessibleHint !== undefined) element.accessibleHint = memory.accessibleHint;
            if (memory.accessiblePointerEvents !== undefined)
                element.accessiblePointerEvents = memory.accessiblePointerEvents;
            if (memory.accessibleText !== undefined) element.accessibleText = memory.accessibleText;
            if (memory.accessibleTitle !== undefined)
                element.accessibleTitle = memory.accessibleTitle;
            if (memory.accessibleType !== undefined) element.accessibleType = memory.accessibleType;
            if (memory.cullable !== undefined) element.cullable = memory.cullable;
            if (memory.cullableChildren !== undefined)
                element.cullableChildren = memory.cullableChildren;
            if (memory.label !== undefined) element.label = memory.label;
            if (memory.origin !== undefined) {
                if (typeof memory.origin === "number") {
                    element.origin.set(memory.origin, memory.origin);
                } else {
                    element.origin.set(memory.origin.x, memory.origin.y);
                }
            }
            if (memory.sortableChildren !== undefined)
                element.sortableChildren = memory.sortableChildren;
            if (memory.zIndex !== undefined) element.zIndex = memory.zIndex;
            if (memory.sortDirty !== undefined) element.sortDirty = memory.sortDirty;
            if (memory.tabIndex !== undefined) element.tabIndex = memory.tabIndex;
            if ("align" in memory && memory.align !== undefined)
                element.align = memory.align as Partial<PointData>;
            if ("percentagePosition" in memory && memory.percentagePosition !== undefined)
                element.percentagePosition = memory.percentagePosition as Partial<PointData>;
        },
    });
    const indexToIgnore: number[] = [];
    memory.sequenceTimelines &&
        Object.entries(memory.sequenceTimelines).forEach(([trackIndex, { sequence, options }]) => {
            const index = Number(trackIndex);
            indexToIgnore.push(index);
            element.playSequence(sequence, { ...options, trackIndex: index });
        });
    element.restoreTracks(memory.tracks.filter((track) => !indexToIgnore.includes(track.track)));
}
