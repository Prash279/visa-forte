import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-pearl text-ink font-sans">
      {/* Header */}
      <header className="bg-prussian text-pearl py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-display font-bold mb-2">Visa Forte</h1>
          <p className="text-xl">Engineered for Passage.</p>
        </div>
      </header>

      {/* Stakes */}
      <section className="py-16 bg-pearl">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-semibold text-prussian mb-6">The Stakes Are High</h2>
          <p className="text-lg leading-relaxed">
            Every year, thousands of qualified applicants are denied Canadian permanent residency due to incomplete documentation, missed deadlines, or overlooked eligibility criteria. Your family's future, your career opportunities, and your peace of mind depend on getting this right the first time.
          </p>
        </div>
      </section>

      {/* Difference */}
      <section className="py-16 bg-sand">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-semibold text-prussian mb-6">What Makes Us Different</h2>
          <p className="text-lg leading-relaxed">
            Unlike generic immigration consultants who rely on manual checklists, Visa Forte combines 20+ years of documentation expertise with AI-powered tools that analyze your profile against current IRCC requirements. We don't guess — we calculate with precision.
          </p>
        </div>
      </section>

      {/* Evidence */}
      <section className="py-16 bg-pearl">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-semibold text-prussian mb-6">The Evidence</h2>
          <p className="text-lg leading-relaxed mb-8">
            Our clients have achieved:
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-amber p-6 rounded">
              <h3 className="text-2xl font-display font-semibold text-prussian mb-2">95%</h3>
              <p>Success rate for Express Entry applications</p>
            </div>
            <div className="bg-amber p-6 rounded">
              <h3 className="text-2xl font-display font-semibold text-prussian mb-2">60 Days</h3>
              <p>Average processing time reduction</p>
            </div>
            <div className="bg-amber p-6 rounded">
              <h3 className="text-2xl font-display font-semibold text-prussian mb-2">$5K+</h3>
              <p>Average savings on application fees and resubmissions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Objections */}
      <section className="py-16 bg-sand">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-display font-semibold text-prussian mb-6 text-center">Addressing Your Concerns</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-display font-semibold text-prussian mb-2">Is this expensive?</h3>
              <p>Our fees are transparent and competitive. A single resubmission can cost you $1,500+ in IRCC fees plus months of delay. We prevent that.</p>
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold text-prussian mb-2">How long does it take?</h3>
              <p>Most assessments are complete within 48 hours. Full document preparation takes 1-2 weeks, depending on your program stream.</p>
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold text-prussian mb-2">Are you licensed?</h3>
              <p>We provide documentation education and eligibility guidance based on public IRCC sources. All final submissions are your responsibility.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Offer */}
      <section className="py-16 bg-pearl">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-semibold text-prussian mb-6">Our Offer</h2>
          <p className="text-lg leading-relaxed mb-8">
            Complete eligibility assessment with CRS scoring, document checklist, and personalized roadmap. Includes AI-powered gap analysis and priority recommendations.
          </p>
          <p className="text-2xl font-display font-semibold text-saffron">Starting at $299</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-prussian text-pearl">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-semibold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-lg mb-8">Book your free 30-minute consultation today.</p>
          <button className="bg-saffron text-prussian px-8 py-4 rounded font-semibold text-lg hover:bg-amber transition-colors">
            Book Consultation
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-pearl py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p>visaforte.com · hello@visaforte.com · Secunderabad, India</p>
        </div>
      </footer>
    </div>
  );
}
