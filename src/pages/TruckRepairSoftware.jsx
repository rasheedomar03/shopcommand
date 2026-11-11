import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Timer, Wrench, FileText, CreditCard, LayoutDashboard, MessageSquare } from 'lucide-react'
import { PublicNav } from '@/components/PublicNav'
import { usePageMeta } from '@/lib/seo'

const CONTACT_EMAIL = 'hello@shopcommand.net'

const faqs = [
  {
    q: 'Is ShopCommand built for heavy-duty and truck repair shops?',
    a: 'Yes. Our first founding customer is a truck repair shop in Illinois, and heavy-duty work shaped the product early: per-job custom parts with per-truck pricing, job timers that keep running across multi-day repair orders, partial payments for fleet accounts, and invoices emailed under your shop\'s own name. Some HD-specific features like preventive maintenance scheduling are still on the roadmap, and we say so plainly on this page.',
  },
  {
    q: 'How much does truck repair shop software cost?',
    a: 'Most platforms in this space do not publish full pricing; you book a demo and get a quote, often priced per user. ShopCommand publishes everything: $100/mo for the first shop plus $50/mo per additional location for founding members, locked for life, with unlimited users. Standard pricing after launch is $175/mo plus $100/mo per additional location. There are 25 founding spots.',
  },
  {
    q: 'How is ShopCommand different from Fullbay?',
    a: 'Fullbay is the established heavy-duty platform, with preventive maintenance scheduling and a fleet customer portal built out over years. ShopCommand is newer and wins on different things: flat per-shop pricing published openly, no per-user fees, a multi-location dashboard, and a direct line to the founder. We keep an honest side-by-side at /compare/fullbay.',
  },
  {
    q: 'Does ShopCommand handle fleet customers?',
    a: 'Fleet work is a core case we build for. You can take partial payments on an invoice, which matters when a fleet pays on terms or splits a big repair across payments, and email invoices under your shop\'s name so the fleet\'s AP department sees you, not a software vendor. Deeper fleet features like PM scheduling per unit are on the roadmap.',
  },
]

const TITLE = 'Truck Repair Shop Software | Heavy Duty Shop Management | ShopCommand'
const DESC = 'Shop management software that fits heavy-duty and truck repair: multi-day job timers, per-truck parts pricing, partial payments for fleet accounts, and flat per-shop pricing published openly. $100/mo founding rate.'
const URL = 'https://shopcommand.net/truck-repair-shop-software'

export default function TruckRepairSoftware() {
  usePageMeta({
    title: TITLE,
    description: DESC,
    path: '/truck-repair-shop-software',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'ShopCommand Truck Repair Shop Software',
        serviceType: 'Heavy-duty repair shop management software',
        url: URL,
        description: DESC,
        provider: { '@type': 'Organization', name: 'ShopCommand', url: 'https://shopcommand.net' },
        areaServed: 'US',
        offers: { '@type': 'Offer', price: '100', priceCurrency: 'USD', description: 'Founding member rate: $100/mo first shop + $50/mo per additional location, locked for life. Standard: $175/mo + $100/mo per additional location.' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Truck Repair Shop Software' },
    ],
  })

  return (
    <div className="min-h-screen bg-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      <PublicNav />

      <main id="main-content">
        {/* Hero */}
        <section className="px-6 py-16 border-b border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Heavy Duty</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Truck Repair Shop Software That Fits How HD Shops Actually Work
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-2xl mx-auto mb-8">
              Multi-day jobs. Fleet accounts that pay on terms. Parts priced differently per truck.
              Most shop software is built for passenger cars and bends awkwardly around all of it.
              ShopCommand was shaped by a truck shop from its first weeks, with flat per-shop pricing
              published right here on the site.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/founding-program" className="px-6 py-3 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
                See the Founding Shop Program →
              </Link>
              <Link to="/demo" className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                Try the live demo
              </Link>
            </div>
          </div>
        </section>

        {/* Why generic software fits poorly */}
        <section className="px-6 py-14">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
              Why generic auto repair software fits heavy-duty shops poorly
            </h2>
            <div className="space-y-4 text-[15px] text-slate-600 leading-relaxed">
              <p>
                Software built around passenger-car work makes assumptions that quietly break in a truck shop.
                It assumes a job opens and closes the same day, so work-in-progress that spans three days of
                diagnosis, parts waiting, and wrench time has nowhere honest to live. It assumes the customer
                is a retail driver who pays at pickup, not a fleet manager with fifteen units on your lot and
                an AP department that pays on net-30 terms.
              </p>
              <p>
                Parts are where the mismatch costs real money. In light-duty work, a part has a price. In
                heavy-duty work, the same part may be priced differently per truck, per customer agreement,
                or per job, and the parts cost on a big repair is often a larger share of the invoice than
                labor. Software that only knows one price per SKU forces advisors into workarounds, and
                workarounds are where margin leaks.
              </p>
              <p>
                And when a repair order stays open for days, labor tracking has to follow. A tech might put
                four hours into a unit on Tuesday, get pulled onto an emergency road-call job Wednesday, and
                come back Thursday. If your software cannot keep a job timer running across that, you end up
                guessing at actual hours, and guessing is how jobs that looked profitable turn out not to be.
              </p>
            </div>
          </div>
        </section>

        {/* What to look for */}
        <section className="px-6 py-14 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
              What to look for in heavy-duty shop software
            </h2>
            <div className="space-y-3 text-[15px] text-slate-600 leading-relaxed">
              <p>Whatever platform you pick, including the ones we compete with, hold it to this list:</p>
              <ul className="space-y-2.5 list-none">
                {[
                  'Repair orders that stay open across days without fighting you, with labor hours tracked against the job the whole way.',
                  'Parts handling that allows custom parts and per-truck or per-job pricing, not one fixed price per SKU.',
                  'Invoicing that works for fleets: partial payments, clear balances, and invoices that go out under your shop\'s name.',
                  'Pricing you can actually find. If the number is behind a sales call, assume it is negotiated, and assume it grows per user.',
                  'A way to see every location at once if you run more than one shop, without logging in and out per location.',
                  'Support that reaches someone who can change the product, not just a ticket queue.',
                ].map(item => (
                  <li key={item} className="flex gap-3">
                    <span className="text-orange-500 font-bold flex-shrink-0 mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How ShopCommand handles it */}
        <section className="px-6 py-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-2 text-center" style={{ letterSpacing: '-0.01em' }}>
              How ShopCommand handles heavy-duty work
            </h2>
            <p className="text-slate-500 text-sm text-center mb-10 max-w-xl mx-auto">
              These are built and in use today, not roadmap promises.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { icon: Wrench, title: 'Per-job custom parts, per-truck pricing', body: 'Add custom parts to any job and price them for that truck and that customer. No fighting a catalog that assumes one price fits every unit.' },
                { icon: Timer, title: 'Job timers across multi-day ROs', body: 'Techs clock in and out of jobs, and the timer survives the days a repair actually takes. Actual hours against each job, not end-of-week guesses.' },
                { icon: FileText, title: 'Invoices under your shop\'s name', body: 'Invoices email directly to the customer under your shop\'s name. The fleet\'s AP department sees your business, not a software vendor.' },
                { icon: CreditCard, title: 'Partial payments for fleet accounts', body: 'Take a deposit, record a partial payment, carry the balance. Built for customers who pay on terms instead of at the counter.' },
                { icon: LayoutDashboard, title: 'Multi-location dashboard', body: 'Run two or three shops? Revenue, open ROs, and tech efficiency for every location in one view, with unlimited users at every shop.' },
                { icon: MessageSquare, title: 'Founder-direct support', body: 'Bug reports and feature requests go to the person who builds the product. Founding shops have seen reported bugs fixed the same day.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="p-5 rounded-2xl border border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-orange-500" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Where we're early */}
        <section className="px-6 py-14 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
              Where we're early
            </h2>
            <div className="space-y-4 text-[15px] text-slate-600 leading-relaxed">
              <p>
                Honesty is the whole brand, so here it is. ShopCommand launched in 2026 and some heavy-duty
                specifics are still on the roadmap: preventive maintenance scheduling per unit, a full fleet
                customer portal (a customer status page with email updates exists today), QuickBooks
                integration, and VMRS coding. If your shop cannot run without those today, Fullbay has spent
                years building them and we keep an honest comparison at{' '}
                <Link to="/compare/fullbay" className="text-orange-600 hover:text-orange-700 font-medium">/compare/fullbay</Link>.
              </p>
              <p>
                What you get in exchange for being early: pricing locked for life at the founding rate, and a
                product whose roadmap is set by the shops using it. The gaps above are ordered by what founding
                shops ask for.
              </p>
            </div>
          </div>
        </section>

        {/* Founding story */}
        <section className="px-6 py-14">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
              Our first founding shop is a truck shop
            </h2>
            <div className="space-y-4 text-[15px] text-slate-600 leading-relaxed">
              <p>
                ShopCommand's first real founding customer is a truck repair shop in Illinois. In their first
                weeks on the product they filed six reports: things that did not work the way a heavy-duty
                shop needed them to. Every one of the six was fixed the same day it was reported.
              </p>
              <p>
                That is not a support SLA; it is what happens when the person answering the report is the
                person who wrote the code. It is also why the heavy-duty features above exist: per-truck
                parts pricing, multi-day job timers, and partial payments were shaped directly by a shop
                that works on trucks all day. Founding members do not just get a discount. They get a
                product that bends toward their shop.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-6 py-14 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.01em' }}>
              Pricing, published like it should be
            </h2>
            <p className="text-slate-500 text-sm mb-8 max-w-xl mx-auto">
              No sales call, no quote, no per-user fees. This is the whole price.
            </p>
            <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto text-left">
              <div className="p-6 rounded-2xl border-2 border-orange-300 bg-white">
                <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">Founding rate · 25 spots</div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">$100<span className="text-sm font-normal text-slate-400">/mo</span></div>
                <p className="text-slate-500 text-sm leading-relaxed">First shop, plus $50/mo per additional location. Locked for life. Unlimited users.</p>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 bg-white">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Standard · after launch</div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">$175<span className="text-sm font-normal text-slate-400">/mo</span></div>
                <p className="text-slate-500 text-sm leading-relaxed">First shop, plus $100/mo per additional location. Unlimited users.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-14">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ letterSpacing: '-0.01em' }}>Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.01em' }}>
              Run a truck shop? Help shape the software you'll use for years.
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              25 founding spots at $100/mo, locked for life. Direct line to the founder, same-day fixes, and a roadmap your shop helps set.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/founding-program" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                Founding Shop Program <ArrowRight size={14} className="inline ml-1" />
              </Link>
              <Link to="/demo" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                Try the live demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 md:px-12 py-10 bg-slate-50/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-shrink-0">
            <span className="text-slate-400 text-sm">ShopCommand</span>
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm transition-colors">
            <Mail size={13} className="flex-shrink-0" />
            {CONTACT_EMAIL}
          </a>
          <div className="flex gap-5">
            <Link to="/compare/fullbay" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Fullbay</Link>
            <Link to="/alternatives/fullbay" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Fullbay Alternatives</Link>
            <Link to="/resources" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Resources</Link>
            <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
