import { CanvasPropertyUtility as PropsUtils } from "@drincs/pixi-vn";
import type { Container } from "pixi.js";

export function getSuperPivot(item: Container) {
    const pivot = PropsUtils.getSuperPoint(item.pivot, item.angle);
    return {
        x: pivot.x + item.width / 2,
        y: pivot.y + item.height,
    };
}
