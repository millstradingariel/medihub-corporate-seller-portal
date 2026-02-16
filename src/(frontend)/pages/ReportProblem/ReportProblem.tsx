import React, { useState } from 'react';
import { Location, Device, Partner } from '../../../../types';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ReportProblemProps {
  locations: Location[];
  devices: Device[];
  partner: Partner;
}

const ReportProblem: React.FC<ReportProblemProps> = ({ locations, devices, partner }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationId: '',
    deviceId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    console.log('Submitting issue:', { ...formData, partnerId: partner.partner_id });
    setTimeout(() => setSubmitted(true), 500);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-4 bg-green-900/20 text-green-500 rounded-full mb-4 border border-green-900/50">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Report Submitted</h2>
        <p className="text-zinc-400 max-w-md">
          Your ticket has been created successfully. Our support team will review it and contact you at {partner.email}.
        </p>
        <button 
          onClick={() => { setSubmitted(false); setFormData({ title: '', description: '', locationId: '', deviceId: '' }); }}
          className="mt-4 px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
        >
          Submit Another Issue
        </button>
      </div>
    );
  }

  const filteredDevices = formData.locationId 
    ? devices.filter(d => d.location_id === formData.locationId)
    : [];

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="text-white" /> Report a Problem
        </h2>
        <p className="text-zinc-400 mt-1">Tell us what's wrong, and we'll fix it.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-800 space-y-6">
        
        {/* Auto-filled info */}
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-6">
          <p className="text-sm text-zinc-500">Reporting as <span className="font-medium text-white">{partner.partner_name}</span> ({partner.email})</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Issue Title</label>
          <input 
            type="text" 
            required
            className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
            placeholder="e.g., Printer not working"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Location</label>
            <select 
              required
              className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none appearance-none"
              value={formData.locationId}
              onChange={e => setFormData({...formData, locationId: e.target.value, deviceId: ''})}
            >
              <option value="">Select Location</option>
              {locations.map(l => (
                <option key={l.location_id} value={l.location_id}>{l.location_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Device (Optional)</label>
            <select 
              className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none appearance-none"
              value={formData.deviceId}
              onChange={e => setFormData({...formData, deviceId: e.target.value})}
              disabled={!formData.locationId}
            >
              <option value="">Select Device</option>
              {filteredDevices.map(d => (
                <option key={d.device_id} value={d.device_id}>{d.device_type} ({d.device_id})</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
          <textarea 
            required
            rows={4}
            className="w-full px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
            placeholder="Describe the issue in detail..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            className="w-full px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
          >
            Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportProblem;