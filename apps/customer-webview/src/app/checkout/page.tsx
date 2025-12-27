'use client';

import { useState } from 'react';

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bvn: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Customer onboarding submitted! (This is a demo)');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6">Complete Your Information</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="+2348012345678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              BVN (Bank Verification Number)
            </label>
            <input
              type="text"
              value={formData.bvn}
              onChange={(e) => setFormData({ ...formData, bvn: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="12345678901"
              maxLength={11}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for identity verification. Your information is secure.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-medium"
          >
            Continue
          </button>
        </form>

        <p className="text-xs text-center text-gray-500 mt-6">
          Powered by CRL Pay - Your information is encrypted and secure
        </p>
      </div>
    </div>
  );
}
