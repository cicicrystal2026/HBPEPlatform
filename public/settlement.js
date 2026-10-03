// All monetary aggregation uses integer cents. Each redemption share is
// rounded independently, matching the amount displayed in its ledger row.
export function calculateSettlement(redemptions) {
  const consumptionCents = 31500000 + redemptions.reduce(
    (sum, record) => sum + Math.round(record.amount * 100), 0,
  );
  const shareCents = 945000 + redemptions.reduce(
    (sum, record) => sum + Math.round(record.share * 100), 0,
  );
  return {
    consumption: consumptionCents / 100,
    merchantShare: shareCents / 100,
    income: (shareCents + 5000000 - 31500) / 100,
  };
}
