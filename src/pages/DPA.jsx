import { Link } from 'react-router-dom'

export default function DPA() {
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
          <h1 style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }} className="text-3xl font-bold text-white mb-2">Data Processing Agreement</h1>
          <p className="text-white/40 text-sm">Last updated: May 13, 2026</p>
          <p className="text-white/40 text-sm mt-1">This DPA is incorporated into and forms part of the ShopCommand <Link to="/terms" className="text-orange-400 hover:underline">Terms of Service</Link>.</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>1. Parties and Purpose</h2>
            <p>
              This Data Processing Agreement ("DPA") is entered into between ShopCommand, Inc. ("ShopCommand" or "Data Processor") and the business entity subscribing to the ShopCommand Service ("Customer" or "Data Controller"). This DPA governs ShopCommand's processing of personal data on behalf of the Customer in connection with the delivery of the ShopCommand platform and associated services.
            </p>
            <p className="mt-3">
              For the purposes of applicable data protection law, including the General Data Protection Regulation (GDPR) where applicable, the Customer acts as the Data Controller and ShopCommand acts as the Data Processor. ShopCommand processes personal data only as directed by the Customer and only for the purposes set out in this DPA and the main Terms of Service.
            </p>
            <p className="mt-3">
              By subscribing to the Service, the Customer agrees to the terms of this DPA. This DPA does not replace or supersede any other data processing agreement separately negotiated and executed between the parties; if such an agreement exists, it takes precedence.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>2. Data We Process on Your Behalf</h2>
            <p>
              In the course of providing the Service, ShopCommand processes the following categories of personal data on behalf of the Customer:
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-1">Customer (End-Customer) Data</p>
                <p className="text-white/55 text-sm">Names, phone numbers, email addresses, and vehicle information belonging to the auto shop's customers. This data is entered by the shop operator or collected via customer-facing status pages.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-1">Technician Data</p>
                <p className="text-white/55 text-sm">Names, clock-in and clock-out timestamps, work records, efficiency metrics, and repair assignments for employees of the auto shop.</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-1">Repair Order Data</p>
                <p className="text-white/55 text-sm">Repair order content, service histories, technician assignments, parts used, status updates, and associated communications including SMS messages sent to end-customers.</p>
              </div>
            </div>
            <p className="mt-4">
              The data subjects are the Customer's own customers and employees. The Customer, as Data Controller, is responsible for ensuring there is a lawful basis for collecting and sharing this personal data with ShopCommand for processing.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>3. How We Process Data</h2>
            <p>
              ShopCommand processes personal data only on documented instructions from the Data Controller. In practice, those instructions are provided through your configuration and use of the ShopCommand platform — for example, entering a repair order, assigning a technician, or triggering an SMS notification. ShopCommand will not process personal data for its own independent purposes without the Controller's explicit instruction, except where required to do so by applicable law, in which case ShopCommand will notify the Controller before processing unless prohibited by law.
            </p>
            <p className="mt-3">
              ShopCommand ensures that all personnel with access to Customer personal data are bound by appropriate confidentiality obligations, whether contractual or statutory.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>4. Sub-processors</h2>
            <p>
              The Customer grants ShopCommand general authorization to engage sub-processors to assist in delivering the Service. ShopCommand's current sub-processors are:
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Twilio Inc.</p>
                  <p className="text-white/40 text-xs mt-0.5">San Francisco, CA, USA</p>
                  <p className="text-white/55 text-sm mt-1">SMS delivery. Receives end-customer phone numbers and message content to transmit repair order notifications.</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Vercel Inc.</p>
                  <p className="text-white/40 text-xs mt-0.5">San Francisco, CA, USA</p>
                  <p className="text-white/55 text-sm mt-1">Cloud hosting and infrastructure. Stores and processes all Customer Data on ShopCommand's behalf.</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Stripe Inc.</p>
                  <p className="text-white/40 text-xs mt-0.5">San Francisco, CA, USA</p>
                  <p className="text-white/55 text-sm mt-1">Payment processing. Handles subscription billing. Processes account holder name, email, and payment card data.</p>
                </div>
              </div>
            </div>
            <p className="mt-4">
              ShopCommand will notify the Customer at least 14 days before adding any new sub-processor that will process Customer personal data. This notification will be sent via email to the address on file for your account. The Customer may object to the appointment of a new sub-processor within that 14-day window by contacting <a href="mailto:dpa@shopcommand.io" className="text-orange-400 hover:underline">dpa@shopcommand.io</a>. If no objection is received, the Customer is deemed to have accepted the new sub-processor.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>5. Security Measures</h2>
            <p>
              ShopCommand implements and maintains appropriate technical and organizational measures to protect Customer personal data against unauthorized access, disclosure, loss, destruction, or alteration. These measures include, but are not limited to:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-white/60">
              <li><strong className="text-white/80">Encryption in transit:</strong> All data transmitted between users and the Service is encrypted using TLS (Transport Layer Security).</li>
              <li><strong className="text-white/80">Encryption at rest:</strong> Customer Data stored in ShopCommand's systems is encrypted using AES-256.</li>
              <li><strong className="text-white/80">Access controls:</strong> Access to production systems and Customer Data is restricted to authorized ShopCommand personnel on a need-to-know basis, enforced through role-based access controls and multi-factor authentication.</li>
              <li><strong className="text-white/80">Regular audits:</strong> ShopCommand conducts regular internal security reviews and vulnerability assessments of its systems and infrastructure.</li>
              <li><strong className="text-white/80">Employee training:</strong> All personnel with access to Customer Data receive appropriate data protection and security training.</li>
            </ul>
            <p className="mt-3">
              ShopCommand will review and update these measures as necessary to maintain an appropriate level of security given the nature of the data processed and evolving threats.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>6. Data Subject Requests</h2>
            <p>
              ShopCommand will provide commercially reasonable assistance to the Customer in fulfilling its obligations to respond to requests from data subjects exercising their rights under applicable data protection law, including rights of access, rectification, erasure, restriction, portability, and objection.
            </p>
            <p className="mt-3">
              If ShopCommand receives a data subject request directly that relates to Customer Data, ShopCommand will promptly forward that request to the Customer and will not respond to the data subject directly except as instructed by the Customer or required by law. ShopCommand will make relevant data available to the Customer within 5 business days of a Customer request to facilitate the Customer's response.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>7. Data Breach Notification</h2>
            <p>
              In the event that ShopCommand becomes aware of a security breach involving Customer personal data, ShopCommand will notify the Customer without undue delay and in any event within 72 hours of becoming aware of the breach.
            </p>
            <p className="mt-3">
              Breach notifications will include, to the extent known at the time of notification: a description of the nature of the breach; the categories and approximate number of data subjects affected; the categories and approximate number of personal data records affected; the likely consequences of the breach; and the measures ShopCommand has taken or proposes to take to address the breach and mitigate its effects.
            </p>
            <p className="mt-3">
              The Customer is responsible for determining whether the breach triggers any notification obligations to data subjects or regulatory authorities under applicable law and for fulfilling those obligations.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>8. Data Deletion</h2>
            <p>
              Upon termination or expiration of the Customer's subscription, the Customer's personal data will be handled as follows:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-white/60">
              <li>Customer Data remains accessible within the platform for 30 days following the subscription end date, during which the Customer may export their data using the platform's export tools.</li>
              <li>After the 30-day export window, ShopCommand will permanently delete Customer Data from its production systems within 90 days.</li>
              <li>Backups containing Customer Data may persist for a short additional period consistent with ShopCommand's backup rotation schedule, after which they will also be deleted.</li>
            </ul>
            <p className="mt-3">
              Upon the Customer's written request, ShopCommand will provide written confirmation of data deletion. ShopCommand may retain anonymized or aggregated data derived from Customer Data that does not identify any individual data subject.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>9. Governing Law</h2>
            <p>
              This DPA shall be governed by the laws of the State of Texas, consistent with the governing law provision of the ShopCommand <Link to="/terms" className="text-orange-400 hover:underline">Terms of Service</Link>. Any disputes arising under this DPA shall be resolved in the courts of Houston, Texas.
            </p>
            <p className="mt-3">
              Where applicable data protection law requires specific contractual provisions (such as EU Standard Contractual Clauses), the parties agree to execute any additional documentation necessary to ensure compliance with those requirements upon request.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>10. Contact</h2>
            <p>
              For questions about this DPA, to exercise data subject rights, or to request additional information about ShopCommand's data processing practices, contact:
            </p>
            <p className="mt-3">
              <a href="mailto:dpa@shopcommand.io" className="text-orange-400 hover:underline">dpa@shopcommand.io</a>
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
          <Link to="/privacy" className="text-white/30 hover:text-white/60 text-xs transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  )
}
