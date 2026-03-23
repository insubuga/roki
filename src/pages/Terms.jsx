import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#080d14] text-white px-4 py-16 z-50">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to ROKI
        </Link>
        <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ROKI, you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">2. Service Description</h2>
            <p>ROKI provides a locker-based laundry and gear management service for gym members. Service availability is limited to participating gym locations.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">3. Waitlist</h2>
            <p>Joining the waitlist does not guarantee access to the service. ROKI reserves the right to launch at gyms at its sole discretion. Waitlist positions are informational and non-binding.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">4. Subscriptions & Payments</h2>
            <p>Paid subscriptions are billed monthly and may be cancelled at any time. Refunds are handled on a case-by-case basis. Pricing may change with 30 days notice to existing subscribers.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">5. Garment Liability</h2>
            <p>ROKI takes reasonable care in handling all garments. We are not liable for pre-existing damage, normal wear and tear, or items not suitable for standard washing. High-value items should not be submitted through the service.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">6. Acceptable Use</h2>
            <p>You agree not to misuse the service, submit hazardous materials, or use the locker system for purposes other than laundry and gear storage.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">7. Termination</h2>
            <p>ROKI may suspend or terminate your account if you violate these terms. You may cancel your membership at any time through the app.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">8. Contact</h2>
            <p>Questions? Reach us at <a href="mailto:hello@rokicyclenetwork.com" className="text-cyan-400 hover:underline">hello@rokicyclenetwork.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}