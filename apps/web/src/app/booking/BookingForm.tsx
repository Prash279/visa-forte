"use client";

import { useState } from "react";
import Link from "next/link";
import { PRICING, formatPrice } from "@/lib/pricing";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";

// The 7 active Visa Forte service tiers (Tier 8 deferred).
const SERVICE_TIERS = [
  "Pre-Application Eligibility Assessment",
  "PNP Stream Matching",
  "Document Review & Compliance Audit",
  "Refusal Analysis & Reapplication Strategy",
  "ITA Response Preparation",
  "Full Application File Management",
  "Post-Submission Monitoring",
];

interface Props {
  availableDates: string[]; // YYYY-MM-DD strings, already filtered to future + open
}

type FormState = "idle" | "submitting" | "success" | "error";

// Razorpay injects a global constructor — declare it so TypeScript is happy.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: () => void): void;
    };
  }
}

// Formats YYYY-MM-DD into a readable label, e.g. "Monday, 14 April 2026"
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Loads the Razorpay checkout.js script once and calls back when ready.
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BookingForm({ availableDates }: Props) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  if (availableDates.length === 0) {
    return (
      <div className="booking-unavailable">
        <p className="booking-unavailable-heading">
          No slots available right now.
        </p>
        <p className="booking-unavailable-body">
          Prashant is currently fully booked. Please check back soon or{" "}
          <a href="/contact" className="booking-unavailable-link">
            contact us directly
          </a>
          .
        </p>
        <Link href="/assessment" className="booking-back-link">
          ← Back to Assessment
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consentGiven) return;
    setFormState("submitting");
    setErrorMessage("");

    const form = e.currentTarget;
    const bookingData = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (
        form.elements.namedItem("email") as HTMLInputElement
      ).value.trim(),
      serviceTier: (form.elements.namedItem("serviceTier") as HTMLSelectElement)
        .value,
      bookingDate: (form.elements.namedItem("bookingDate") as HTMLSelectElement)
        .value,
      query: (
        form.elements.namedItem("query") as HTMLTextAreaElement
      ).value.trim(),
    };

    // Step 1 — Load Razorpay script.
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMessage(
        "Could not load the payment system. Please check your connection and try again.",
      );
      setFormState("error");
      return;
    }

    // Step 2 — Create a Razorpay order server-side.
    let orderData: {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
    };
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceTier: bookingData.serviceTier }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrorMessage(
          typeof json.error === "string"
            ? json.error
            : "Could not initiate payment.",
        );
        setFormState("error");
        return;
      }
      orderData = (await res.json()) as typeof orderData;
    } catch {
      setErrorMessage("A network error occurred. Please try again.");
      setFormState("error");
      return;
    }

    // Step 3 — Open Razorpay checkout modal.
    // On success, Razorpay calls the handler with payment tokens.
    // On dismiss (user closes modal), we re-enable the form.
    await new Promise<void>((resolve) => {
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Visa Forte",
        description: bookingData.serviceTier,
        prefill: {
          name: bookingData.name,
          email: bookingData.email,
        },
        theme: { color: "#0c2340" },

        // Step 4 — Verify payment server-side and save booking.
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...bookingData,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const json = (await verifyRes.json()) as { error?: string };
              setErrorMessage(
                typeof json.error === "string"
                  ? json.error
                  : "Payment verification failed.",
              );
              setFormState("error");
            } else {
              setFormState("success");
            }
          } catch {
            setErrorMessage(
              "Payment was received but we could not confirm your booking. Please email prashant@visaforte.com with your payment ID.",
            );
            setFormState("error");
          }
          resolve();
        },
      });

      rzp.on("payment.failed", () => {
        setErrorMessage(
          "Payment failed. Please try again or use a different payment method.",
        );
        setFormState("error");
        resolve();
      });

      // User dismissed the modal without paying — let them try again.
      const originalOpen = rzp.open.bind(rzp);
      rzp.open = () => {
        originalOpen();
        // Poll for modal close without a native dismiss event.
      };

      rzp.open();
    });
  }

  if (formState === "success") {
    return (
      <div className="booking-success">
        <div className="booking-success-icon" aria-hidden="true">
          ✓
        </div>
        <h2 className="booking-success-title">Booking Confirmed</h2>
        <p className="booking-success-body">
          Your payment has been received and your consultation is booked.
          Prashant will confirm the appointment details by email within 24
          hours.
        </p>
        <a href="/services" className="booking-success-link">
          Explore our service tiers →
        </a>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      {/* Preferred date */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="bookingDate">
          Preferred Date <span className="booking-required">*</span>
        </label>
        <select
          className="booking-select"
          id="bookingDate"
          name="bookingDate"
          required
          defaultValue=""
          disabled={formState === "submitting"}
        >
          <option value="" disabled>
            Select an available date
          </option>
          {availableDates.map((d) => (
            <option key={d} value={d}>
              {formatDate(d)}
            </option>
          ))}
        </select>
      </div>

      {/* Service tier */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="serviceTier">
          Service Required <span className="booking-required">*</span>
        </label>
        <select
          className="booking-select"
          id="serviceTier"
          name="serviceTier"
          required
          defaultValue=""
          disabled={formState === "submitting"}
          onChange={(e) => setSelectedTier(e.target.value)}
        >
          <option value="" disabled>
            Select a service tier
          </option>
          {SERVICE_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </div>

      {/* Price display — shown once a tier is selected */}
      {selectedTier && PRICING[selectedTier] && (
        <div className="booking-price-block">
          <span className="booking-price-label">Consultation Fee</span>
          <span className="booking-price-amount">
            {formatPrice(selectedTier)}
          </span>
          <span className="booking-price-note">
            Paid securely via Razorpay · UPI, Net Banking, Cards accepted
          </span>
        </div>
      )}

      {/* Full name */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="name">
          Full Name <span className="booking-required">*</span>
        </label>
        <input
          className="booking-input"
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Your full name"
          disabled={formState === "submitting"}
        />
      </div>

      {/* Email */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="email">
          Email Address <span className="booking-required">*</span>
        </label>
        <input
          className="booking-input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={formState === "submitting"}
        />
      </div>

      {/* Query / consultation topic */}
      <div className="booking-field">
        <label className="booking-label" htmlFor="query">
          Your Question or Issue <span className="booking-required">*</span>
        </label>
        <p className="booking-field-hint">
          Please describe your immigration situation or question in as much
          detail as possible. The more context you provide, the more focused and
          productive your consultation will be.
        </p>
        <textarea
          className="booking-textarea"
          id="query"
          name="query"
          required
          minLength={10}
          rows={6}
          placeholder="e.g. I received an ITA for Express Entry on 10 April 2026. My spouse holds a valid Canadian work permit. I need help reviewing my educational credential documents before I submit my application…"
          disabled={formState === "submitting"}
        />
      </div>

      {/* DPDP consent — must be checked before payment proceeds */}
      <ConsentCheckbox checked={consentGiven} onConsent={setConsentGiven} />

      {/* Error */}
      {formState === "error" && (
        <p className="booking-error" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        className="booking-submit"
        type="submit"
        disabled={formState === "submitting" || !consentGiven}
      >
        {formState === "submitting" ? "Processing…" : "Proceed to Payment →"}
      </button>

      <p className="booking-privacy">
        Payment is processed securely by Razorpay. Your card details are never
        stored on our servers. By proceeding, you agree to our{" "}
        <a href="/refund-policy" className="booking-policy-link">
          Refund Policy
        </a>{" "}
        and{" "}
        <a href="/privacy-policy" className="booking-policy-link">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
