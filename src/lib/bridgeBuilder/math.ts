export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function countSubsetSolutions(sortedValues: readonly number[], target: number): number {
  let count = 0;
  const dfs = (start: number, remaining: number): void => {
    if (remaining === 0) {
      count += 1;
      return;
    }
    for (let i = start; i < sortedValues.length; i += 1) {
      if (i > start && sortedValues[i] === sortedValues[i - 1]) continue;
      const value = sortedValues[i] as number;
      // The ordinary generator uses positive values, where this bound is
      // safe. Signed shim puzzles need to keep exploring after a negative
      // value because a later positive plank can restore the target.
      if (value > remaining && !sortedValues.some((v) => v < 0)) break;
      dfs(i + 1, remaining - value);
    }
  };
  dfs(0, target);
  return count;
}

export function findSubset(
  sortedValues: readonly number[],
  target: number
): number[] | null {
  const acc: number[] = [];
  const dfs = (start: number, remaining: number): boolean => {
    if (remaining === 0) return true;
    for (let i = start; i < sortedValues.length; i += 1) {
      if (i > start && sortedValues[i] === sortedValues[i - 1]) continue;
      const value = sortedValues[i] as number;
      if (value > remaining && !sortedValues.some((v) => v < 0)) break;
      acc.push(value);
      if (dfs(i + 1, remaining - value)) return true;
      acc.pop();
    }
    return false;
  };
  return dfs(0, target) ? [...acc].sort((a, b) => a - b) : null;
}
