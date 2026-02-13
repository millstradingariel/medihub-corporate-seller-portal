import React, { useState } from 'react';
import { Partner } from '../../../../types';
import { MessageSquare, Send } from 'lucide-react';

interface FeedbackProps {
  partner: Partner;
}

const Feedback: React.FC<FeedbackProps> = ({ partner }) => {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting feedback:', { partnerId: partner.partner_id, message });
    setTimeout(() => setSubmitted(true), 500);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in duration-500">
        <div className="p-4 bg-blue-900/20 text-blue-500 rounded-full mb-4 border border-blue-900/50">
          <Send size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Thank You!</h2>
        <p className="text-zinc-400 max-w-md">We appreciate your feedback. It helps us improve the Medihub experience for everyone.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-white" /> Send Feedback
        </h2>
        <p className="text-zinc-400 mt-1">Have a suggestion or feature request? Let us know.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
            <input 
              type="text" 
              readOnly
              className="w-full px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed"
              value={partner.partner_name}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <input 
              type="text" 
              readOnly
              className="w-full px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed"
              value={partner.email}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Your Message</label>
          <textarea 
            required
            rows={6}
            className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
            placeholder="Type your feedback here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            className="w-full px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 flex justify-center items-center gap-2"
          >
            <Send size={18} />
            Send Feedback
          </button>
        </div>
      </form>
    </div>
  );
};

export default Feedback;