// Tradercolorconfig - unified'scolor assignment logic
// used for ComparisonChart and Leaderboard，ensurecolorconsistency

export const TRADER_COLORS = [
  'rgb(195, 245, 60)', // Lime green (primary)
  '#c084fc', // purple-400
  '#34d399', // emerald-400
  '#fb923c', // orange-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#38bdf8', // sky-400
  '#a78bfa', // violet-400
  '#4ade80', // green-400
  '#fb7185', // rose-400
]

/**
 * based ontrader'sindex positiongetcolor
 * @param traders - traderlist
 * @param traderId - currenttrader'sID
 * @returns corresponding'scolor value
 */
export function getTraderColor(
  traders: Array<{ trader_id: string }>,
  traderId: string
): string {
  const traderIndex = traders.findIndex((t) => t.trader_id === traderId)
  if (traderIndex === -1) return TRADER_COLORS[0] // default returnLinea color
  // if exceeds color pool size，loopUse
  return TRADER_COLORS[traderIndex % TRADER_COLORS.length]
}
