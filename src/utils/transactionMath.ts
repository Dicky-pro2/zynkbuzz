export const WITHDRAWAL_FEE_RATE = 0.005;

export function calculateWithdrawalFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount * WITHDRAWAL_FEE_RATE).toFixed(2));
}

export function calculateNetWithdrawal(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Number((amount - calculateWithdrawalFee(amount)).toFixed(2));
}

export function calculateAdvertiserImpact(nairaBudget: number) {
  if (!Number.isFinite(nairaBudget) || nairaBudget <= 0) {
    return { follows: 0, likes: 0, engagement: 0 };
  }

  const follows = Number(((nairaBudget / 5000) * 15).toFixed(2));
  const likes = Number(((nairaBudget / 5000) * 20).toFixed(2));
  const engagement = Number(((nairaBudget / 5000) * 20).toFixed(2));

  return { follows, likes, engagement };
}
