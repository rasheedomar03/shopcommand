import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0A0B12] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-[#0A0B12]/80">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <svg width="26" height="26" viewBox="0 0 64 64">
            <polygon points="32.00,4.00 56.25,18.00 56.25,46.00 32.00,60.00 7.75,46.00 7.75,18.00" fill="#F97316" />
            <polygon points="32.00,16.82 45.58,24.66 45.58,40.34 32.00,48.18 18.42,40.34 18.42,24.66" fill="#0A0B12" />
          </svg>
          <span style={{ letterSpacing: '-0.02em' }} className="text-sm font-semibold">
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
          <h1 style={{ letterSpacing: '-0.02em' }} className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-white/40 text-sm">Last updated: May 13, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-white text-base font-semibold mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the ShopCommand platform, including any web-based application, API, or associated services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you are entering into these Terms on behalf of a business entity, you represent that you have the authority to bind that entity to these Terms, and references to "you" shall mean that entity. If you do not agree to these Terms, you must not access or use the Service.
            </p>
            <p className="mt-3">
              These Terms constitute a legally binding agreement between you ("Customer" or "you") and ShopCommand, Inc. ("ShopCommand," "we," or "us"). Your continued use of the Service following any posted amendments to these Terms constitutes your acceptance of those amendments.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">2. Description of Service</h2>
            <p>
              ShopCommand is a cloud-based auto repair shop management platform designed for independent and multi-location auto repair businesses. The Service provides tools for managing repair orders, tracking technician activity, monitoring revenue and shop performance, communicating with customers via SMS, managing parts inventory, and obtaining operational visibility across multiple shop locations from a single interface.
            </p>
            <p className="mt-3">
              The Service is provided on a subscription basis and delivered "as-is" and "as available." ShopCommand makes commercially reasonable efforts to maintain availability and performance, but does not guarantee uninterrupted or error-free access. Features and functionality may change over time as we continue to develop and improve the platform. We will use reasonable efforts to notify you of any material changes to the core features you rely upon.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">3. Account Registration</h2>
            <p>
              To access the Service, you must register for an account and provide accurate, current, and complete information as prompted during the registration process. You agree to maintain and promptly update your account information to keep it accurate, current, and complete. Each subscription account is intended for use by a single business entity. You may not create multiple accounts to circumvent subscription limits or usage restrictions.
            </p>
            <p className="mt-3">
              You are solely responsible for maintaining the confidentiality of your account credentials, including your username and password. You are responsible for all activity that occurs under your account, whether or not authorized by you. You agree to notify ShopCommand immediately at <a href="mailto:support@shopcommand.io" className="text-orange-400 hover:underline">support@shopcommand.io</a> if you become aware of any unauthorized use of your account or any other breach of security. ShopCommand will not be liable for any loss or damage arising from your failure to protect your account credentials.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">4. Subscription and Payment</h2>
            <p>
              Access to ShopCommand requires a paid subscription. Current pricing is <strong className="text-white">$175 per month</strong> for a single location, or <strong className="text-white">$125 per location per month</strong> for accounts with multiple locations. An annual subscription option is available and provides savings equivalent to two months of service at no additional charge.
            </p>
            <p className="mt-3">
              Subscription fees are billed monthly in advance on the date you subscribe. All fees are non-refundable, including for partial months. If you cancel your subscription mid-billing cycle, you will retain access to the Service through the end of the current billing period, but no prorated refund will be issued.
            </p>
            <p className="mt-3">
              ShopCommand reserves the right to change subscription pricing. Any price changes will be communicated to you no less than 30 days before they take effect via email to the address on file for your account. Your continued use of the Service after the price change takes effect constitutes your acceptance of the new pricing. If you do not agree to the new pricing, you may cancel your subscription before the change takes effect.
            </p>
            <p className="mt-3">
              You authorize ShopCommand to charge your payment method on a recurring basis for all applicable subscription fees. If a payment fails, ShopCommand may suspend your access to the Service until the outstanding balance is paid in full. ShopCommand uses Stripe, Inc. as its payment processor; by providing your payment information you also agree to Stripe's terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">5. Acceptable Use</h2>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these Terms. The following conduct is expressly prohibited:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-white/60">
              <li>Reverse engineering, decompiling, disassembling, or attempting to derive the source code of any part of the Service.</li>
              <li>Reselling, sublicensing, or otherwise providing access to the Service to third parties without ShopCommand's prior written consent.</li>
              <li>Using the Service to engage in any illegal activity, including unauthorized data collection, fraud, or violation of consumer protection laws.</li>
              <li>Uploading, transmitting, or distributing any malware, viruses, or other harmful or malicious code through the Service.</li>
              <li>Attempting to gain unauthorized access to any portion of the Service, its underlying systems, or other users' accounts.</li>
              <li>Using the Service to send unsolicited communications, spam, or harassing messages to your customers or any third parties.</li>
              <li>Interfering with or disrupting the integrity, performance, or availability of the Service or its underlying infrastructure.</li>
              <li>Scraping, crawling, or using automated tools to extract data from the Service beyond what is enabled by standard platform functionality or an authorized API.</li>
            </ul>
            <p className="mt-3">
              ShopCommand reserves the right to investigate potential violations and, if confirmed, to suspend or terminate your account and take any other action permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">6. Data Ownership</h2>
            <p>
              All data you input into ShopCommand — including repair order records, customer names and contact information, vehicle histories, technician records, and any other business data — remains your property ("Customer Data"). ShopCommand does not claim ownership of Customer Data.
            </p>
            <p className="mt-3">
              By using the Service, you grant ShopCommand a limited, non-exclusive, worldwide, royalty-free license to store, process, copy, transmit, and display Customer Data solely as necessary to provide the Service to you, to improve and maintain the platform, and to comply with applicable law. This license terminates when your subscription ends and Customer Data is deleted in accordance with our data retention practices.
            </p>
            <p className="mt-3">
              You are solely responsible for the accuracy, legality, and appropriateness of all Customer Data you input into the Service. You represent and warrant that you have all rights, consents, and permissions necessary to provide Customer Data to ShopCommand, including any data relating to your own customers or employees.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">7. Privacy</h2>
            <p>
              Your use of the Service is also governed by ShopCommand's <Link to="/privacy" className="text-orange-400 hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. The Privacy Policy describes how we collect, use, and share information about you and your use of the Service.
            </p>
            <p className="mt-3">
              ShopCommand uses Twilio, Inc. to deliver SMS messages to your customers on your behalf. When you use the Service's messaging features, Twilio acts as a sub-processor transmitting messages that you initiate. You are responsible for ensuring you have obtained any legally required consent from your customers before sending them SMS communications via the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">8. Intellectual Property</h2>
            <p>
              ShopCommand and its licensors own all right, title, and interest in and to the Service, including all software, algorithms, interfaces, visual design, user experience, documentation, trademarks, logos, and brand elements (collectively, "ShopCommand IP"). These Terms do not grant you any rights in ShopCommand IP other than the limited right to access and use the Service as described herein.
            </p>
            <p className="mt-3">
              You own your Customer Data. ShopCommand owns the platform that processes it. You may not use ShopCommand's name, logo, or branding in any way that implies endorsement, partnership, or affiliation without prior written consent.
            </p>
            <p className="mt-3">
              If you provide ShopCommand with any feedback, suggestions, or ideas regarding the Service ("Feedback"), you grant ShopCommand an irrevocable, perpetual, royalty-free license to use and incorporate that Feedback into the Service or other products without any obligation to you.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, ShopCommand's total aggregate liability to you for any claims arising out of or relating to these Terms or your use of the Service shall not exceed the total subscription fees paid by you to ShopCommand in the three (3) months immediately preceding the event giving rise to the claim.
            </p>
            <p className="mt-3">
              In no event shall ShopCommand be liable for any indirect, incidental, consequential, special, exemplary, or punitive damages, including but not limited to loss of profits, loss of revenue, loss of data, loss of goodwill, business interruption, or cost of substitute services, even if ShopCommand has been advised of the possibility of such damages and regardless of the theory of liability.
            </p>
            <p className="mt-3">
              Some jurisdictions do not allow the exclusion or limitation of incidental or consequential damages, so the above limitations may not apply to you in their entirety. In such jurisdictions, ShopCommand's liability shall be limited to the fullest extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless ShopCommand, its officers, directors, employees, contractors, agents, licensors, and suppliers from and against any and all claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including reasonable attorneys' fees) arising out of or relating to:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1.5 text-white/60">
              <li>Your use of or access to the Service in violation of these Terms.</li>
              <li>Customer Data you submit to the Service, including any claim that such data infringes, misappropriates, or violates any third-party rights.</li>
              <li>Your violation of any applicable law or regulation in connection with your use of the Service.</li>
              <li>Any claim by your customers, employees, or any other third party arising from your use of the Service or the data you manage through it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">11. Termination</h2>
            <p>
              Either party may terminate the subscription at any time. You may cancel your subscription through your account settings or by contacting <a href="mailto:support@shopcommand.io" className="text-orange-400 hover:underline">support@shopcommand.io</a>. Cancellation takes effect at the end of your current billing period.
            </p>
            <p className="mt-3">
              ShopCommand may suspend or terminate your access to the Service immediately, without prior notice or liability, if you fail to pay any subscription fees when due, if you materially breach any provision of these Terms and fail to cure that breach within 10 days of receiving written notice, or if continued access would pose a legal, security, or reputational risk to ShopCommand or other users.
            </p>
            <p className="mt-3">
              Upon cancellation or termination, you may export your Customer Data within 30 days of your subscription end date using the data export tools available in the Service. After that 30-day window, ShopCommand will delete your Customer Data within 90 days in accordance with its data retention practices, and such deletion will be irreversible. Provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law principles. Any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the state and federal courts located in Houston, Texas. You irrevocably consent to personal jurisdiction and venue in such courts and waive any objection you may have to the exercise of jurisdiction by such courts.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">13. Changes to Terms</h2>
            <p>
              ShopCommand reserves the right to modify these Terms at any time. For material changes — including changes to pricing, data rights, liability limitations, or dispute resolution — we will notify you via email to the address associated with your account at least 14 days before the changes take effect. Non-material changes (such as clarifications or minor formatting updates) may take effect immediately upon posting.
            </p>
            <p className="mt-3">
              The current version of these Terms is always available at <strong className="text-white">shopcommand.io/terms</strong>. Your continued use of the Service after any changes take effect constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">14. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact our legal team at:
            </p>
            <p className="mt-3">
              <a href="mailto:legal@shopcommand.io" className="text-orange-400 hover:underline">legal@shopcommand.io</a>
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
          <Link to="/privacy" className="text-white/30 hover:text-white/60 text-xs transition-colors">Privacy Policy</Link>
          <Link to="/dpa" className="text-white/30 hover:text-white/60 text-xs transition-colors">DPA</Link>
        </div>
      </footer>
    </div>
  )
}
