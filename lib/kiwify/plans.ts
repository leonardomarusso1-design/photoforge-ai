export type KiwifyPlan = {
  name: string;
  productIds: string[];
  matchNames: string[];
  credits: number;
  checkoutUrl: string;
  isSubscription: boolean;
  price: number;
  priceLabel: string;
};

export const plans: KiwifyPlan[] = [
  {
    name: "Comunidade Mensal",
    productIds: ["f4e46e90-6db7-11f1-b855-cfbee15f603a"],
    matchNames: ["comunidade mensal", "comunidade"],
    credits: 15,
    checkoutUrl: "https://pay.kiwify.com.br/9keMQeh",
    isSubscription: true,
    price: 29.90,
    priceLabel: "R$29,90/mês"
  },
  {
    name: "Avulso 50",
    productIds: ["a311aa50-6db8-11f1-92a2-49c5d650ebdd"],
    matchNames: ["avulso 50"],
    credits: 50,
    checkoutUrl: "https://pay.kiwify.com.br/PgO4KjC",
    isSubscription: false,
    price: 89.90,
    priceLabel: "R$89,90"
  },
  {
    name: "Avulso 20",
    productIds: ["557706f0-6db8-11f1-b073-01b22d1b39bb"],
    matchNames: ["avulso 20"],
    credits: 20,
    checkoutUrl: "https://pay.kiwify.com.br/E3k9PpC",
    isSubscription: false,
    price: 39.90,
    priceLabel: "R$39,90"
  },
  {
    name: "Recarga Comunidade",
    productIds: ["cf3604f0-6db8-11f1-a9e7-59067d63ed2e"],
    matchNames: ["recarga comunidade", "recarga"],
    credits: 20,
    checkoutUrl: "https://pay.kiwify.com.br/TVkBgVn",
    isSubscription: false,
    price: 19.90,
    priceLabel: "R$19,90"
  }
];

export function resolvePlan(productName: string, productId?: string): KiwifyPlan | null {
  if (productId) {
    for (const plan of plans) {
      if (plan.productIds.includes(productId)) return plan;
    }
  }
  const lower = productName.toLowerCase();
  for (const plan of plans) {
    if (plan.matchNames.some((n) => lower.includes(n))) return plan;
  }
  return null;
}
