// Data for /alternatives/:slug pages. All competitor claims here are limited
// to facts already published on our /compare pages — no new specifics.

const YEAR = new Date().getFullYear()

export const SHOPCOMMAND_PRICING =
  '$100/mo first shop + $50/mo per additional location (founding, locked forever); $175 + $100 standard after launch. No per-seat fees, unlimited users.'

const shopCommandCard = {
  name: 'ShopCommand',
  isUs: true,
  positioning: 'The multi-location command center for auto repair shop owners',
  bestFor: 'Owners running 2–10 locations who need cross-shop visibility',
  description:
    'ShopCommand puts revenue, repair orders, and technician efficiency for every location in one dashboard — no jumping between logins. It\'s new, and we\'re honest about that: founding members get a locked-forever rate and a direct line to the founder while the roadmap is being built around them.',
  pricing: SHOPCOMMAND_PRICING,
  multiShop: true,
}

// Reusable competitor cards. Descriptions stay neutral-to-positive and only
// repeat claims already made on our compare pages.
const cards = {
  tekmetric: {
    name: 'Tekmetric',
    positioning: 'Mature, full-featured shop management platform',
    bestFor: 'Single-location shops that want a deep, proven feature set',
    description:
      'Tekmetric has been built out over years and holds 600+ G2 reviews. It covers day-to-day operations end to end — CRM and marketing, embedded payments, tire management, and two-way texting on higher tiers.',
    pricing: 'Not published — demo and sales call required; per-user pricing.',
    multiShop: true,
  },
  shopmonkey: {
    name: 'Shopmonkey',
    positioning: 'Modern cloud platform with a large installed base',
    bestFor: 'Shops that want built-in texting and customer communication',
    description:
      'Shopmonkey is used by 8,000+ shops and includes two-way texting on all plans, integrated Buy Now Pay Later, and a CRM Essentials module. Multi-location is available, though it isn\'t the product\'s core focus.',
    pricing: 'Not published — demo required; per-seat pricing.',
    multiShop: true,
  },
  autoleap: {
    name: 'AutoLeap',
    positioning: 'Cloud-based shop management software',
    bestFor: 'Shops looking at newer cloud-native platforms',
    description:
      'AutoLeap is a cloud-based shop management platform covering estimates, repair orders, and customer communication. Worth including on a shortlist if you\'re comparing modern browser-based options.',
    pricing: 'See their website for current pricing.',
    multiShop: false,
  },
  mitchell1: {
    name: 'Mitchell1',
    positioning: 'The legacy leader in repair data',
    bestFor: 'Shops whose techs live in repair data and wiring diagrams',
    description:
      'Mitchell1 serves 50,000+ shops and pairs shop management with industry-leading ProDemand repair data and an extensive parts supplier network. It grew up as a Windows desktop product, with cloud access arriving incrementally.',
    pricing: 'Not published — contact sales; per-user licensing.',
    multiShop: false,
  },
  'shop-ware': {
    name: 'Shop-Ware',
    positioning: 'Digital-inspection-first shop management',
    bestFor: 'Single-location shops focused on customer communication',
    description:
      'Shop-Ware is known for best-in-class digital inspections, built-in customer texting, and strong workflow automation, with 1,000+ shops on the platform. Its focus is single-location operations.',
    pricing: 'Not published — demo required.',
    multiShop: false,
  },
  ari: {
    name: 'ARI',
    positioning: 'Lightweight shop management app',
    bestFor: 'Smaller operations that want a simple, low-commitment tool',
    description:
      'ARI is a lighter-weight shop management option covering the basics — estimates, invoices, and customer records. A reasonable fit if a full platform is more than your shop needs today.',
    pricing: 'See their website for current pricing.',
    multiShop: false,
  },
}

const withUs = keys => [shopCommandCard, ...keys.map(k => cards[k])]

export const alternativesData = {
  tekmetric: {
    competitor: 'Tekmetric',
    title: `Top Tekmetric Alternatives for Auto Repair Shops (${YEAR})`,
    metaTitle: `Top Tekmetric Alternatives for Auto Repair Shops (${YEAR})`,
    metaDescription:
      'Six Tekmetric alternatives compared: pricing, best-fit, and multi-shop support. Includes options with published pricing and no per-seat fees.',
    intro:
      'Tekmetric is a mature platform with 600+ G2 reviews, but it doesn\'t publish pricing — you have to book a demo and talk to sales — and it charges per user, so costs climb as your team grows. Owners also find that multi-location visibility lives in a separate module rather than the core product. Here are the alternatives worth a look.',
    whySwitch: [
      'Pricing isn\'t published — a demo and sales call are required for a quote',
      'Per-user pricing means the bill grows with every seat you add',
      'Multi-location visibility is a separate module / higher tier, not the core product',
      'Multiple feature tiers plus paid add-ons make total cost hard to predict',
    ],
    alternatives: withUs(['shopmonkey', 'autoleap', 'mitchell1', 'shop-ware', 'ari']),
    faqs: [
      { q: 'What is the best Tekmetric alternative?', a: 'It depends on your shop. For multi-location owners who want cross-shop visibility and published pricing, ShopCommand is built for exactly that. For single-location shops wanting another mature cloud platform, Shopmonkey and Shop-Ware are strong options.' },
      { q: 'How much does Tekmetric cost?', a: 'Tekmetric doesn\'t publish pricing — you need to book a demo and get a quote from sales, and it uses per-user pricing. ShopCommand publishes its pricing openly: $100/mo for the first shop plus $50/mo per additional location for founding members, locked forever.' },
      { q: 'Is there a Tekmetric alternative without per-seat fees?', a: 'Yes. ShopCommand charges per shop with unlimited users — whether you have 2 people or 20 at each location, the price is the same.' },
      { q: 'Which Tekmetric alternative is best for multiple locations?', a: 'ShopCommand is built specifically for owners running 2–10 locations: one dashboard for revenue, repair orders, and technician efficiency across every shop. Shopmonkey also supports multiple locations, though it isn\'t the core focus.' },
    ],
  },
  shopmonkey: {
    competitor: 'Shopmonkey',
    title: `Top Shopmonkey Alternatives for Auto Repair Shops (${YEAR})`,
    metaTitle: `Top Shopmonkey Alternatives for Auto Repair Shops (${YEAR})`,
    metaDescription:
      'Six Shopmonkey alternatives for auto repair shops: how they compare on pricing transparency, per-seat fees, and multi-location dashboards.',
    intro:
      'Shopmonkey is a modern platform with 8,000+ shops, but its pricing sits behind a demo, it charges per seat, and multi-location support isn\'t the product\'s core focus. If any of those are dealbreakers for you, these alternatives are worth comparing.',
    whySwitch: [
      'Pricing isn\'t published — you have to book a demo to get a number',
      'Per-seat pricing adds up as your team grows',
      'Multi-location is available but not what the product is built around',
      'Enterprise-style onboarding rather than same-day setup',
    ],
    alternatives: withUs(['tekmetric', 'autoleap', 'mitchell1', 'shop-ware', 'ari']),
    faqs: [
      { q: 'What is the best Shopmonkey alternative?', a: 'For multi-location owners, ShopCommand — it\'s built around cross-shop visibility with published per-shop pricing. For single-location shops wanting a deep, mature feature set, Tekmetric (600+ G2 reviews) is the most established alternative.' },
      { q: 'How much does Shopmonkey cost?', a: 'Shopmonkey doesn\'t publish pricing — a demo is required — and it uses per-seat pricing. ShopCommand is $100/mo for the first shop plus $50/mo per additional location for founding members, with unlimited users included.' },
      { q: 'Is there a Shopmonkey alternative with published pricing?', a: 'ShopCommand shows its pricing openly on the site: $100/mo + $50/mo per additional shop founding, $175 + $100 standard after launch. No sales call needed to know what you\'ll pay.' },
      { q: 'Which alternative is best if I run several shops?', a: 'ShopCommand is built for owners running 2–10 locations — one dashboard across every shop, priced per shop rather than per seat. Tekmetric offers multi-shop capability as a separate module on higher tiers.' },
    ],
  },
  mitchell1: {
    competitor: 'Mitchell1',
    title: `Top Mitchell1 Alternatives for Auto Repair Shops (${YEAR})`,
    metaTitle: `Top Mitchell1 Alternatives for Auto Repair Shops (${YEAR})`,
    metaDescription:
      'Cloud-native Mitchell1 alternatives compared: setup time, per-user licensing, mobile access, and multi-shop dashboards for repair shop owners.',
    intro:
      'Mitchell1 is the legacy leader — 50,000+ shops and industry-leading ProDemand repair data — but it grew up as a Windows desktop product, uses per-user licensing, and setup can take weeks of training. Owners who want cloud-native, mobile-friendly software tend to shortlist these alternatives.',
    whySwitch: [
      'Desktop roots — cloud access is incremental, not native',
      'Per-user licensing rather than a flat per-shop price',
      'Legacy interface with incremental updates',
      'Setup measured in weeks, with training required',
    ],
    alternatives: withUs(['tekmetric', 'shopmonkey', 'autoleap', 'shop-ware', 'ari']),
    faqs: [
      { q: 'What is the best Mitchell1 alternative?', a: 'If you need cross-shop visibility across multiple locations, ShopCommand — fully browser-based with published pricing. If you want a mature single-location cloud platform, Tekmetric and Shopmonkey are the most established options.' },
      { q: 'How much does Mitchell1 cost?', a: 'Mitchell1 doesn\'t publish pricing — you contact sales for a quote, and it uses per-user licensing. ShopCommand publishes its pricing: $100/mo first shop + $50/mo per additional location for founding members, unlimited users.' },
      { q: 'Are there cloud-based alternatives to Mitchell1?', a: 'Yes — ShopCommand, Tekmetric, Shopmonkey, AutoLeap, and Shop-Ware are all cloud platforms. ShopCommand is fully browser-based and works on any device with same-day setup, no installation.' },
      { q: 'Will I lose repair data if I leave Mitchell1?', a: 'Mitchell1\'s ProDemand repair data is industry-leading, and if your techs depend on it daily, that\'s a real consideration. Many shops keep a repair-data subscription separately while running management software that fits how they operate.' },
    ],
  },
  'shop-ware': {
    competitor: 'Shop-Ware',
    title: `Top Shop-Ware Alternatives for Auto Repair Shops (${YEAR})`,
    metaTitle: `Top Shop-Ware Alternatives for Auto Repair Shops (${YEAR})`,
    metaDescription:
      'Shop-Ware alternatives for repair shops compared on pricing transparency, single vs. multi-location focus, and per-shop vs. tiered pricing.',
    intro:
      'Shop-Ware has best-in-class digital inspections and built-in customer texting, but its pricing sits behind a demo, features are gated across tiers, and the product is focused on single-location operations. If you\'re outgrowing that — especially into multiple locations — these alternatives are worth comparing.',
    whySwitch: [
      'Pricing isn\'t published — a demo is required for a quote',
      'Single-location focus — not built around multi-shop visibility',
      'Multiple tiers with features gated behind higher plans',
      'Guided onboarding process rather than same-day setup',
    ],
    alternatives: withUs(['tekmetric', 'shopmonkey', 'autoleap', 'mitchell1', 'ari']),
    faqs: [
      { q: 'What is the best Shop-Ware alternative?', a: 'For owners with multiple locations, ShopCommand — it\'s built around cross-shop visibility with flat per-shop pricing. For single-location shops wanting another full-featured platform, Tekmetric (600+ G2 reviews) and Shopmonkey (8,000+ shops) are the most established.' },
      { q: 'How much does Shop-Ware cost?', a: 'Shop-Ware doesn\'t publish pricing — you book a demo to get a quote. ShopCommand publishes its pricing: $100/mo first shop + $50/mo per additional location for founding members (locked forever), $175 + $100 standard after launch.' },
      { q: 'Does Shop-Ware support multiple locations?', a: 'Shop-Ware focuses on single-location operations. ShopCommand is built from the ground up for the multi-location owner — consolidated reporting and one dashboard across all shops.' },
      { q: 'Which alternative has the strongest digital inspections?', a: 'Digital inspections are Shop-Ware\'s standout strength, so weigh that honestly. Tekmetric and Shopmonkey both offer inspection workflows as part of mature platforms; ShopCommand\'s inspection tooling is part of its roadmap alongside its core multi-shop dashboard.' },
    ],
  },
  'ro-writer': {
    competitor: 'R.O. Writer',
    title: `Top R.O. Writer Alternatives for Auto Repair Shops (${YEAR})`,
    metaTitle: `Top R.O. Writer Alternatives for Auto Repair Shops (${YEAR})`,
    metaDescription:
      'Cloud-based R.O. Writer alternatives: no Windows install, no per-workstation licensing. Compare pricing, mobile access, and multi-shop dashboards.',
    intro:
      'R.O. Writer is an established Windows desktop platform with deep parts integrations and a built-in labor guide, but it isn\'t true cloud software: installation takes days to weeks, licensing is per workstation, and mobile support is limited. Owners moving to browser-based software shortlist these alternatives.',
    whySwitch: [
      'Windows desktop software — not true cloud, limited mobile access',
      'Per-workstation licensing instead of a flat per-shop price',
      'Installation and setup measured in days to weeks',
      'Legacy interface compared to modern browser-based platforms',
    ],
    alternatives: withUs(['tekmetric', 'shopmonkey', 'autoleap', 'mitchell1', 'shop-ware']),
    faqs: [
      { q: 'What is the best R.O. Writer alternative?', a: 'For multi-location owners, ShopCommand — fully browser-based, per-shop pricing, one dashboard across every location. For a single shop wanting a mature cloud platform, Tekmetric and Shopmonkey are the most established options.' },
      { q: 'How much does R.O. Writer cost?', a: 'R.O. Writer doesn\'t publish pricing — you contact sales — and it uses per-workstation licensing. ShopCommand publishes its pricing: $100/mo first shop + $50/mo per additional location for founding members, with unlimited users on any device.' },
      { q: 'Are there cloud alternatives to R.O. Writer?', a: 'Yes — ShopCommand, Tekmetric, Shopmonkey, AutoLeap, and Shop-Ware are all cloud-based. ShopCommand runs entirely in the browser: no Windows install, no server, and same-day setup on phone, tablet, or laptop.' },
      { q: 'Will I lose parts integrations if I switch?', a: 'Parts integrations are a core strength of R.O. Writer, so compare carefully. Mitchell1 also has an extensive parts supplier network; ShopCommand\'s parts integrations are on the roadmap, with inventory tracking available today.' },
    ],
  },
}

export default alternativesData
