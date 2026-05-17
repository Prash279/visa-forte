"use client";

const MAILTO_SUBJECT = "Document Triage Assessment — [Your Name]";
const MAILTO_BODY =
  "Dear Prashant,\n\nI am writing to request a Document Triage Assessment for my Express Entry application. I want to ensure my documentation is in order before I proceed.\n\nMy details:\n\nFull name:\nCurrent location (city, country):\nExpress Entry program: CEC / FSWP / FSTP\nCurrent CRS score:\nITA received: Yes / No\nPrimary documentation concern:\n\nI am ready to proceed and look forward to hearing from you.\n\n[Full name]\n[WhatsApp / Phone]";

interface MailtoButtonProps {
  className?: string;
  children: React.ReactNode;
}

export default function MailtoButton({ className, children }: MailtoButtonProps) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    window.location.href = `mailto:prashant@visaforte.com?subject=${encodeURIComponent(MAILTO_SUBJECT)}&body=${encodeURIComponent(MAILTO_BODY)}`;
  }

  return (
    <a href="#triage" className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
