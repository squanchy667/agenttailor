interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with AI context assembly at no cost.',
    features: [
      '50 requests / day',
      '3 projects',
      '20 documents per project',
      'ChatGPT + Claude support',
      'Community support',
    ],
    cta: 'Get Started Free',
    href: '/signup?plan=free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For power users who need more capacity and insights.',
    features: [
      '500 requests / day',
      '20 projects',
      '100 documents per project',
      'Quality analytics dashboard',
      'Web search enrichment',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'For teams that need collaboration and enterprise features.',
    features: [
      '2,000 requests / day',
      '100 projects',
      '500 documents per project',
      'Team management',
      'SSO / SAML',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    href: '/signup?plan=team',
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Start free and scale as you grow. No hidden fees.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
                tier.highlighted
                  ? 'border-primary-500 bg-white ring-2 ring-primary-500'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{tier.description}</p>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  <span className="ml-1 text-sm text-gray-500">{tier.period}</span>
                </div>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm text-gray-600">
                    <svg
                      className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={tier.href}
                className={`block rounded-lg px-4 py-3 text-center text-sm font-semibold transition ${
                  tier.highlighted
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
