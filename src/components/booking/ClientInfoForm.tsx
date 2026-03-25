"use client";

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

interface Props {
  info: ClientInfo;
  onChange: (info: ClientInfo) => void;
}

export default function ClientInfoForm({ info, onChange }: Props) {
  return (
    <div>
      <h2 className="font-heading text-3xl mb-2 text-center">Your Information</h2>
      <p className="text-navy/50 font-body text-sm text-center mb-8">
        Tell us how to reach you
      </p>

      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <label htmlFor="book-name" className="block text-sm text-navy/60 mb-2 font-body">
            Full Name *
          </label>
          <input
            id="book-name"
            type="text"
            required
            value={info.name}
            onChange={(e) => onChange({ ...info, name: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-email" className="block text-sm text-navy/60 mb-2 font-body">
            Email *
          </label>
          <input
            id="book-email"
            type="email"
            required
            value={info.email}
            onChange={(e) => onChange({ ...info, email: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-phone" className="block text-sm text-navy/60 mb-2 font-body">
            Phone
          </label>
          <input
            id="book-phone"
            type="tel"
            value={info.phone}
            onChange={(e) => onChange({ ...info, phone: e.target.value })}
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors"
          />
        </div>
        <div>
          <label htmlFor="book-notes" className="block text-sm text-navy/60 mb-2 font-body">
            Notes (optional)
          </label>
          <textarea
            id="book-notes"
            rows={3}
            value={info.notes}
            onChange={(e) => onChange({ ...info, notes: e.target.value })}
            placeholder="Any special requests or details about what you're looking for..."
            className="w-full border-b border-navy/20 bg-transparent py-3 text-navy font-body focus:outline-none focus:border-rose transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}
