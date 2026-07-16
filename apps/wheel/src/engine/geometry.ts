// Pointer is fixed at the top of the wheel. Drawing convention (see WheelEngine):
// segment 0 starts exactly at the top (local angle 0) and segments are laid out
// clockwise from there. This function returns the wheel rotation (in degrees,
// assuming the wheel currently sits at rotation 0) needed to bring the center
// of `segmentIndex` under the pointer, plus `minFullSpins` extra full turns.
export function computeTargetRotation(
  segmentIndex: number,
  totalSegments: number,
  minFullSpins: number,
): number {
  const segmentAngle = 360 / totalSegments;
  const segmentCenterAngle = segmentIndex * segmentAngle + segmentAngle / 2;
  // small jitter within the segment so the landing doesn't look mechanically perfect
  const jitter = (Math.random() - 0.5) * segmentAngle * 0.6;
  const finalAngle = segmentCenterAngle + jitter;
  const targetWithinCircle = (360 - finalAngle + 360) % 360;
  return minFullSpins * 360 + targetWithinCircle;
}
