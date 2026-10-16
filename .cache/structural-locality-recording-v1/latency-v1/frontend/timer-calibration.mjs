export function sampleTimerCalibration(clock = () => performance.now(), attempts = 100_000) {
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 100_000)
    throw Error("invalid timer calibration attempt count");
  let positiveCount = 0, zeroCount = 0, negativeCount = 0, nonfiniteCount = 0;
  let minPositiveMs = Infinity, maxPositiveMs = 0;
  const positiveSamplesMs = [];
  for (let index = 0; index < attempts; index++) {
    const before = clock(), after = clock();
    if (!Number.isFinite(before) || !Number.isFinite(after)) {
      nonfiniteCount++;
      continue;
    }
    const delta = after - before;
    if (delta < 0) negativeCount++;
    else if (delta === 0) zeroCount++;
    else {
      positiveCount++;
      minPositiveMs = Math.min(minPositiveMs, delta);
      maxPositiveMs = Math.max(maxPositiveMs, delta);
      if (positiveSamplesMs.length < 64) positiveSamplesMs.push(delta);
    }
  }
  return { method: "EMPIRICAL_MIN_DELTA", attempts, positiveCount, zeroCount,
    negativeCount, nonfiniteCount,
    minPositiveMs: positiveCount ? minPositiveMs : null,
    maxPositiveMs: positiveCount ? maxPositiveMs : null, positiveSamplesMs };
}

export function validateTimerCalibration(value) {
  if (value?.method !== "EMPIRICAL_MIN_DELTA" ||
      !Number.isSafeInteger(value.attempts) || value.attempts < 1 || value.attempts > 100_000 ||
      !["positiveCount", "zeroCount", "negativeCount", "nonfiniteCount"].every((name) =>
        Number.isSafeInteger(value[name]) && value[name] >= 0) ||
      value.positiveCount + value.zeroCount + value.negativeCount + value.nonfiniteCount !== value.attempts ||
      value.positiveCount < 1 || value.negativeCount !== 0 || value.nonfiniteCount !== 0 ||
      !Number.isFinite(value.minPositiveMs) || value.minPositiveMs <= 0 ||
      !Number.isFinite(value.maxPositiveMs) || value.maxPositiveMs < value.minPositiveMs ||
      !Array.isArray(value.positiveSamplesMs) || value.positiveSamplesMs.length > 64 ||
      value.positiveSamplesMs.length !== Math.min(64, value.positiveCount) ||
      value.positiveSamplesMs.some((sample) => !Number.isFinite(sample) || sample <= 0 ||
        sample < value.minPositiveMs || sample > value.maxPositiveMs))
    throw Error("invalid timer calibration receipt");
  return value.minPositiveMs;
}
