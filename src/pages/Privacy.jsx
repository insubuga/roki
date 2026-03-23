import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#080d14] text-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to ROKI
        </Link>
        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-gray-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-lg mb-3">1. Information We Collect</h2>
            <p>When you join the ROKI waitlist, we collect your email address, gym name, and optionally your workout frequency. If you become a member, we may collect additional information needed to provide our laundry and locker services.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">2. How We Use Your Information</h2>
            <p>We use your information to manage your waitlist position, notify you when ROKI launches at your gym, send service updates, and improve our platform. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">3. Email Communications</h2>
            <p>By joining the waitlist you agree to receive launch updates and service announcements. You may unsubscribe at any time by clicking the unsubscribe link in any email we send.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">4. Data Storage</h2>
            <p>Your data is stored securely in the United States. We use industry-standard encryption and security practices to protect your information.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">5. Payments</h2>
            <p>Payment processing is handled by Stripe. ROKI does not store your full credit card details. Stripe's privacy policy governs the handling of your payment information.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by emailing us at privacy@rokicyclenetwork.com.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-lg mb-3">7. Contact</h2>
            <p>Questions? Reach us at <a href="mailto:privacy@rokicyclenetwork.com" className="text-cyan-400 hover:underline">privacy@rokicyclenetwork.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}