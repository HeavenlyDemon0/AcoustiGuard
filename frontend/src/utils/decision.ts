import type { Decision } from "../types/inference";

export function getDecision(
    score: number,
    threshold: number | null
): Decision {
    if (threshold === null) {
        return "PENDING";
    }

    return score > threshold ? "ANOMALY" : "NORMAL";
}

export function getDecisionMargin(
    score: number,
    threshold: number | null
): number | null {
    if (threshold === null) {
        return null;
    }

    return score - threshold;
}