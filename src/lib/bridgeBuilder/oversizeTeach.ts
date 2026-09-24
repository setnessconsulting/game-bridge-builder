import { formatScaled } from "./format";

/**
 * GAME-302: teach copy for oversized planks.
 * Math (remaining/excess/wouldOverhang) is engine-authoritative via
 * previewPlacementFit; these helpers only format presentation copy and
 * always name the remaining span ("too long for N left").
 */

export function amountPhrase(value: number, denominator: number): string {
  const absoluteValue = Math.abs(value);
  const formatted = formatScaled(absoluteValue, denominator);
  return `${formatted} ${absoluteValue === denominator ? "unit" : "units"}`;
}

export function tooLongForCopy(input: {
  pieceLabel: string;
  remaining: number;
  excess: number;
  denominator: number;
}): string {
  return `${input.pieceLabel} is too long for ${amountPhrase(input.remaining, input.denominator)} left. It would stick out by ${amountPhrase(input.excess, input.denominator)}. Choose a shorter plank.`;
}

export function tooLongShortCopy(remaining: number, denominator: number): string {
  return `Too long for ${amountPhrase(remaining, denominator)} left`;
}
