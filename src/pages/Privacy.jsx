import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0A0B12] text-white" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-[#0A0B12]/80">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <svg width="26" height="26" viewBox="0 0 64 64">
            <polygon points="32,4 57.86,18 57.86,46 32,60 6.14,46 6.14,18" fill="#F97316" />
            <polygon points="32,18.56 46.78,26.78 46.78,43.22 32,51.44 17.22,43.22 17.22,26.78" fill="#0A0B12" />
          </svg>
          <span style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', letterSpacing: '-0.02em' }} className="text-sm font-semibold">
            Shop<span className="text-orange-500">Command</span>
          </span>
        </Link>
        <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors">
          Log in
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }} className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/40 text-sm">Last updated: May 13, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>1. Information We Collect</h2>
            <p>
              ShopCommand collects several categories of information in connection with your use of the Service:
            </p>
            <p className="mt-4 text-white/50 text-xs uppercase tracking-wider font-medium">Account Information</p>
            <p className="mt-1">
              When you register for an account, we collect information you provide directly, including your name, email address, phone number, and business name. This information is used to create and manage your account and to communicate with you about the Service.
            </p>
            <p className="mt-4 text-white/50 text-xs uppercase tracking-wider font-medium">Shop Data</p>
            <p className="mt-1">
              As you use ShopCommand to manage your business, we store data you enter or that is generated through your use of the platform. This includes repair orders, technician records and clock-in history, customer names and phone numbers, vehicle information, parts and inventory records, and revenue data. This data is collected and stored on your behalf — ShopCommand acts as a data processor for this category of information, and you remain the data controller.
            </p>
            <p className="mt-4 text-white/50 text-xs uppercase tracking-wider font-medium">Usage Data</p>
            <p className="mt-1">
              We automatically collect certain information about how you interact with the Service, including pages and features you visit, timestamps of activity, browser type and version, device type, IP address, and referral source. This data is used to understand how the platform is used, to detect and prevent abuse, and to improve the product.
            </p>
            <p className="mt-4 text-white/50 text-xs uppercase tracking-wider font-medium">Payment Information</p>
            <p className="mt-1">
              Subscription payments are processed by Stripe, Inc. ShopCommand does not store your full credit card number, CVV, or other sensitive payment card data on its servers. We may retain the last four digits of your card, expiration date, billing name, and billing address for account management and customer service purposes.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>2. How We Use Your Information</h2>
            <p>
              ShopCommand uses the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-white/60">
              <li><strong className="text-white/80">Delivering the Service:</strong> Processing repair orders, displaying shop performance data, enabling technician management, and all other core platform functionality.</li>
              <li><strong className="text-white/80">Transactional SMS:</strong> Sending SMS messages to your customers on your behalf via Twilio, Inc., based on triggers you configure (e.g., repair order status updates, appointment reminders).</li>
              <li><strong className="text-white/80">Customer support:</strong> Responding to your questions, investigating issues, and resolving disputes.</li>
              <li><strong className="text-white/80">Product improvements:</strong> Analyzing usage patterns to identify areas for improvement, develop new features, and fix bugs.</li>
              <li><strong className="text-white/80">Product updates and communications:</strong> Sending you information about new features, important platform changes, and company announcements. You may opt out of non-transactional marketing emails at any time by clicking "Unsubscribe" in any such email.</li>
              <li><strong className="text-white/80">Security and fraud prevention:</strong> Detecting, investigating, and preventing fraudulent transactions, unauthorized access, and other abuse.</li>
              <li><strong className="text-white/80">Legal compliance:</strong> Meeting our obligations under applicable law, including responding to valid legal process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>3. How We Share Your Information</h2>
            <p>
              ShopCommand does not sell your personal information or your Customer Data to third parties. We share information only in the following limited circumstances:
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-1">Twilio Inc.</p>
                <p className="text-white/55 text-sm">SMS delivery sub-processor. Receives customer phone numbers and message content as needed to deliver SMS messages you initiate through the platform.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-1">Vercel Inc.</p>
                <p className="text-white/55 text-sm">Cloud hosting and infrastructure provider. Hosts the ShopCommand application and associated data storage infrastructure.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-1">Stripe Inc.</p>
                <p className="text-white/55 text-sm">Payment processing. Handles subscription billing and receives payment card information on ShopCommand's behalf.</p>
              </div>
            </div>
            <p className="mt-4">
              We may also share information with law enforcement or other government authorities when required by a valid legal order, subpoena, or applicable law. In the event of a merger, acquisition, or sale of assets, your information may be transferred to the successor entity, subject to the same privacy protections.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>4. Data Retention</h2>
            <p>
              We retain your account and Customer Data for as long as your subscription is active. After you cancel your subscription, your data remains available within the platform for 30 days to allow you to export it. Following that 30-day window, your Customer Data is permanently deleted within 90 days of your subscription end date.
            </p>
            <p className="mt-3">
              We may retain certain account-level and usage information for a longer period as required for legal compliance, audit purposes, or to resolve disputes.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>5. Security</h2>
            <p>
              ShopCommand takes the security of your data seriously. We implement the following measures to protect your information:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-white/60">
              <li>All data is encrypted in transit using TLS (Transport Layer Security).</li>
              <li>Data at rest is encrypted using AES-256 encryption.</li>
              <li>Access to production systems is restricted to authorized personnel only, using role-based access controls and multi-factor authentication.</li>
              <li>We conduct regular security reviews and vulnerability assessments.</li>
              <li>In the event of a data breach affecting your information, we will notify you within 72 hours of becoming aware of the breach, as required by applicable law.</li>
            </ul>
            <p className="mt-3">
              While we implement robust security measures, no system is completely immune to security threats. You are responsible for maintaining the security of your account credentials and for notifying us promptly of any suspected unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>6. Your Rights</h2>
            <p>
              Depending on where you are located, you may have certain rights regarding your personal information:
            </p>
            <p className="mt-4 text-white/50 text-xs uppercase tracking-wider font-medium">California Residents (CCPA)</p>
            <p className="mt-1">
              If you are a California resident, you have the right to know what personal information we collect, use, and disclose about you; the right to request deletion of your personal information; and the right to opt out of the sale of your personal information. ShopCommand does not sell personal information. To exercise your rights, contact us at <a href="mailto:privacy@shopcommand.io" className="text-orange-400 hover:underline">privacy@shopcommand.io</a>.
            </p>
            <p className="mt-4 text-white/50 text-xs uppercase tracking-wider font-medium">EU/EEA Residents (GDPR)</p>
            <p className="mt-1">
              If you are located in the European Union or European Economic Area, you have the right to access personal information we hold about you; the right to rectification of inaccurate data; the right to erasure ("right to be forgotten"); the right to data portability; and the right to object to processing. To exercise any of these rights, contact us at <a href="mailto:privacy@shopcommand.io" className="text-orange-400 hover:underline">privacy@shopcommand.io</a>. We will respond to your request within 30 days.
            </p>
            <p className="mt-3">
              You may also have the right to lodge a complaint with your local data protection authority if you believe we have not handled your information in accordance with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>7. Cookies</h2>
            <p>
              ShopCommand uses cookies and similar tracking technologies to operate the Service and improve your experience. We use two categories of cookies:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-white/60">
              <li><strong className="text-white/80">Essential cookies:</strong> Required for core functionality such as keeping you logged in, maintaining your session, and securing your account. These cannot be disabled without disrupting your use of the Service.</li>
              <li><strong className="text-white/80">Analytics cookies:</strong> Used to understand how users interact with the platform so we can improve it. These are optional and can be declined via the cookie consent banner displayed on your first visit.</li>
            </ul>
            <p className="mt-3">
              Your cookie preferences are stored locally in your browser. You can change your preference at any time by clearing your browser's local storage or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>8. Children's Privacy</h2>
            <p>
              The Service is designed for use by businesses and is not directed at children under the age of 13. ShopCommand does not knowingly collect personal information from children under 13. If we become aware that we have inadvertently collected information from a child under 13, we will take prompt steps to delete that information. If you believe we may have collected such information, please contact us at <a href="mailto:privacy@shopcommand.io" className="text-orange-400 hover:underline">privacy@shopcommand.io</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or for other reasons. For material changes — such as changes to how we use or share personal information — we will notify you by email to the address associated with your account at least 14 days before the changes take effect.
            </p>
            <p className="mt-3">
              The current version of this Privacy Policy is always available at <strong className="text-white">shopcommand.io/privacy</strong>. Your continued use of the Service after any changes take effect constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>10. Contact</h2>
            <p>
              For questions about this Privacy Policy or to exercise your data rights, contact our privacy team at:
            </p>
            <p className="mt-3">
              <a href="mailto:privacy@shopcommand.io" className="text-orange-400 hover:underline">privacy@shopcommand.io</a>
              <br />
              ShopCommand, Inc.
              <br />
              Houston, Texas
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
        <p className="text-slate-500 text-xs">© 2026 ShopCommand. All rights reserved.</p>
        <div className="flex gap-4">
          <Link to="/terms" className="text-white/30 hover:text-white/60 text-xs transition-colors">Terms of Service</Link>
          <Link to="/dpa" className="text-white/30 hover:text-white/60 text-xs transition-colors">DPA</Link>
        </div>
      </footer>
    </div>
  )
}
