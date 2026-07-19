// PremiumBuyButton — client-side purchase flow for a premium resource.
// Collects the buyer's name + email (needed for the receipt email), opens
// Razorpay checkout, and on verified payment starts the PDF download and
// shows a re-download link. All amounts and secrets live server-side —
// this component only ever sees the public key id.

'use client';

import { useState } from 'react';
import type { JSX } from 'react';

// Same shape as the declaration in ItaCountdownTool.tsx — TypeScript merges
// identical global declarations; changing one requires changing both.
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: () => void): void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type PurchaseState = 'idle' | 'processing' | 'done' | 'error';

interface PremiumBuyButtonProps {
  resourceId: string;
  title: string;
}

export default function PremiumBuyButton({
  resourceId,
  title,
}: PremiumBuyButtonProps): JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<PurchaseState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  async function handlePurchase(): Promise<void> {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMessage('Enter your name and a valid email to receive the PDF.');
      setState('error');
      return;
    }

    setState('processing');
    setErrorMessage('');

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMessage(
        'Could not load the payment system. Please check your connection and try again.',
      );
      setState('error');
      return;
    }

    let orderData: {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
    };
    try {
      const res = await fetch('/api/resources/premium/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setErrorMessage(
          typeof json.error === 'string'
            ? json.error
            : 'Could not initiate payment. Please try again.',
        );
        setState('error');
        return;
      }
      orderData = (await res.json()) as typeof orderData;
    } catch {
      setErrorMessage('Could not initiate payment. Please try again.');
      setState('error');
      return;
    }

    const rzp = new window.Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: 'Visa Forte',
      description: title,
      prefill: { name, email },
      theme: { color: '#0c2340' },

      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch('/api/resources/premium/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resourceId,
              name,
              email,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (!verifyRes.ok) {
            const json = (await verifyRes.json()) as { error?: string };
            setErrorMessage(
              typeof json.error === 'string'
                ? json.error
                : 'Payment verification failed.',
            );
            setState('error');
            return;
          }
          const { downloadUrl: url } = (await verifyRes.json()) as {
            downloadUrl: string;
          };
          setDownloadUrl(url);
          setState('done');
          // Start the download immediately — the link below is the backup.
          window.location.assign(url);
        } catch {
          setErrorMessage(
            'Payment was received but the download could not start. Please email prashant@visaforte.com with your payment ID.',
          );
          setState('error');
        }
      },

      modal: {
        // Buyer closed the Razorpay window without paying — back to idle.
        ondismiss: () => {
          setState((current) => (current === 'processing' ? 'idle' : current));
        },
      },
    });
    rzp.open();
  }

  if (state === 'done') {
    return (
      <div className="resource-premium-cta">
        <p className="resource-download-ready">
          Payment confirmed — your download has started.
        </p>
        <a href={downloadUrl} className="resource-cta resource-cta--free">
          Download Again →
        </a>
        <p className="resource-cta-note">
          A download link has also been emailed to you.
        </p>
      </div>
    );
  }

  return (
    <div className="resource-premium-cta">
      <input
        type="text"
        className="resource-buy-input"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Your name"
      />
      <input
        type="email"
        className="resource-buy-input"
        placeholder="Email for your download link"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email for your download link"
      />
      <button
        className="resource-cta resource-cta--premium"
        onClick={() => void handlePurchase()}
        disabled={state === 'processing'}
      >
        {state === 'processing' ? 'Processing…' : 'Buy Now →'}
      </button>
      {state === 'error' && (
        <p className="resource-buy-error" role="alert">
          {errorMessage}
        </p>
      )}
      <p className="resource-cta-note">
        Secure payment via Razorpay. Instant PDF download + email copy.
      </p>
    </div>
  );
}
