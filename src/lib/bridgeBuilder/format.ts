import type { Band } from "@/lib/games/core/types";
import { gcd } from "./math";

const FRACTION_GLYPHS: Record<string, string> = {
  "1/2": "\u00BD",
  "1/4": "\u00BC",
  "3/4": "\u00BE",
  "1/8": "\u215B",
  "3/8": "\u215C",
  "5/8": "\u215D",
  "7/8": "\u215E",
  "1/3": "\u2153",
  "2/3": "\u2154",
  "1/6": "\u2159",
  "5/6": "\u215A",
};

export function formatScaled(units: number, denominator: number): string {
  const sign = units < 0 ? "\u2212" : "";
  const abs = Math.abs(units);
  const whole = Math.floor(abs / denominator);
  const rem = abs % denominator;
  if (rem === 0) return `${sign}${whole}`;
  const divisor = gcd(rem, denominator);
  const n = rem / divisor;
  const d = denominator / divisor;
  const glyph = FRACTION_GLYPHS[`${n}/${d}`];
  const frac = glyph ?? `${n}/${d}`;
  if (whole === 0) return `${sign}${frac}`;
  return `${sign}${whole} ${frac}`;
}

export function trimDecimal(value: number): string {
  const fixed = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return fixed === "" || fixed === "-" ? "0" : fixed;
}

export function formatPieceLabel(
  kind: import("./types").PieceKind,
  units: number,
  denominator: number,
  sessionX?: number | null
): string {
  if (kind === "beam-x") return "x";
  if (kind === "beam-2x") return "2x";
  if (kind === "strut") return formatScaled(units, denominator);
  if (kind === "shim") {
    const magnitude = formatScaled(Math.abs(units), denominator);
    return units < 0 ? `\u2212${magnitude}` : `+${magnitude}`;
  }
  void sessionX;
  return formatScaled(units, denominator);
}

export function bandForGrade(grade: number): Band {
  if (grade <= 2) return "g12";
  if (grade <= 4) return "g34";
  if (grade <= 6) return "g56";
  return "g78";
}
