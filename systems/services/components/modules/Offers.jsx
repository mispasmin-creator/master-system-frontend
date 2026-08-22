import React, { useEffect, useState } from 'react';
import { servicesApi } from '../../lib/api';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active | history
  const [search, setSearch] = useState('');
  const [firmFilter, setFirmFilter] = useState('All');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [newOffer, setNewOffer] = useState({
    firmName: 'PMMPL',
    vendor: '',
    description: '',
    location: '',
    amount: '',
    isOffer: 'Yes',
    offerCopy: ''
  });

  const [convertForm, setConvertForm] = useState({
    checker: '',
    amount: '',
    tdsAmount: '',
    remark: ''
  });

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.get('/offers', { firm: firmFilter, search });
      if (res.success) {
        setOffers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [firmFilter, search]);

  const handleFileUpload = async (e, setter, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await servicesApi.upload(file);
      setter((prev) => ({ ...prev, [key]: url }));
    } catch (err) {
      alert(`File upload failed: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newOffer.vendor || !newOffer.amount) {
      alert('Please fill in Vendor and Amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await servicesApi.post('/offers', newOffer);
      if (res.success) {
        setIsCreateOpen(false);
        setNewOffer({ firmName: 'PMMPL', vendor: '', description: '', location: '', amount: '', isOffer: 'Yes', offerCopy: '' });
        fetchOffers();
      }
    } catch (err) {
      alert(`Error creating offer: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getOfferOutstanding = (offer) => {
    if (!offer) return 0;
    if (offer.outstanding !== undefined && offer.outstanding !== null) {
      return offer.outstanding;
    }
    return Math.max(0, (offer.amount || 0) - (offer.amountPaid || 0));
  };

  const handleConvertOpen = (offer) => {
    setSelectedOffer(offer);
    const currentOutstanding = getOfferOutstanding(offer);
    setConvertForm({
      checker: '',
      amount: currentOutstanding || '',
      tdsAmount: '0',
      remark: `Converted from Offer ${offer.offerNo}`
    });
    setIsConvertOpen(true);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOffer) return;

    const convertAmt = parseFloat(convertForm.amount) || 0;
    const currentOutstanding = getOfferOutstanding(selectedOffer);

    if (convertAmt <= 0) {
      alert('Please enter a valid conversion amount greater than 0.');
      return;
    }

    if (convertAmt > currentOutstanding) {
      alert(`Amount (₹${convertAmt}) exceeds outstanding balance of ₹${currentOutstanding}.`);
      return;
    }

    setSaving(true);
    try {
      const res = await servicesApi.post(`/offers/${selectedOffer.id}/convert`, convertForm);
      if (res.success) {
        setIsConvertOpen(false);
        setSelectedOffer(null);
        fetchOffers();
        alert(`Successfully converted ₹${convertAmt} from Offer ${selectedOffer.offerNo} to Service Job ${res.data.serviceNo}!`);
      } else {
        alert(res.error || 'Failed to convert offer.');
      }
    } catch (err) {
      alert(`Error converting offer: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (activeTab === 'active') return o.status !== 'Converted';
    return o.status === 'Converted';
  });

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Service Offers</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage service offer quotations and convert them to service jobs</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Create Offer</span>
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Active Offers ({offers.filter((o) => o.status !== 'Converted').length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Converted History ({offers.filter((o) => o.status === 'Converted').length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search vendor, description, offer no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 px-3 w-48 sm:w-64 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          />
          <select
            value={firmFilter}
            onChange={(e) => setFirmFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none"
          >
            <option value="All">All Firms</option>
            <option value="PMMPL">PMMPL</option>
            <option value="PMM Logisol">PMM Logisol</option>
            <option value="PMM Retail">PMM Retail</option>
            <option value="PMM Infra">PMM Infra</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="p-3">Offer No</th>
              <th className="p-3">Firm</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Description</th>
              <th className="p-3">Location</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Amount To Be Paid</th>
              <th className="p-3">Outstanding Amount</th>
              <th className="p-3">Offer Copy</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-zinc-500">Loading offers...</td>
              </tr>
            ) : filteredOffers.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-zinc-500">No offers found.</td>
              </tr>
            ) : (
              filteredOffers.map((o) => {
                const outstandingAmt = getOfferOutstanding(o);
                const isConvertible = o.status !== 'Converted' && outstandingAmt > 0;

                return (
                  <tr key={o.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-semibold text-zinc-900 dark:text-white">{o.offerNo}</td>
                    <td className="p-3">{o.firmName}</td>
                    <td className="p-3 font-medium">{o.vendor}</td>
                    <td className="p-3 max-w-xs truncate" title={o.description}>{o.description || '-'}</td>
                    <td className="p-3">{o.location || '-'}</td>
                    <td className="p-3 font-semibold">{formatCurrency(o.amount)}</td>
                    <td className="p-3 font-semibold">{formatCurrency(o.amountPaid || 0)}</td>
                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(outstandingAmt)}
                    </td>
                    <td className="p-3">
                      {o.offerCopy ? (
                        <a href={o.offerCopy} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-medium">View File</a>
                      ) : (
                        <span className="text-zinc-400">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'Converted' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {isConvertible && (
                        <button
                          onClick={() => handleConvertOpen(o)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors cursor-pointer"
                        >
                          Convert to Service
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Offer Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create Service Offer</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Firm Name</label>
                  <select
                    value={newOffer.firmName}
                    onChange={(e) => setNewOffer({ ...newOffer, firmName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="PMMPL">PMMPL</option>
                    <option value="PMM Logisol">PMM Logisol</option>
                    <option value="PMM Retail">PMM Retail</option>
                    <option value="PMM Infra">PMM Infra</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={newOffer.vendor}
                    onChange={(e) => setNewOffer({ ...newOffer, vendor: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={newOffer.location}
                    onChange={(e) => setNewOffer({ ...newOffer, location: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newOffer.amount}
                    onChange={(e) => setNewOffer({ ...newOffer, amount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Offer Copy Attachment</label>
                <input
                  type="file"
                  onChange={(e) => handleFileUpload(e, setNewOffer, 'offerCopy')}
                  className="w-full text-xs text-zinc-500"
                />
                {newOffer.offerCopy && <p className="text-[11px] text-emerald-600 mt-1 truncate">Uploaded: {newOffer.offerCopy}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Service Modal */}
      {isConvertOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Convert Offer {selectedOffer.offerNo}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Outstanding Balance: <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(getOfferOutstanding(selectedOffer))}</span>
              </p>
            </div>
            <form onSubmit={handleConvertSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Checker Name</label>
                <input
                  type="text"
                  required
                  placeholder="Person responsible for checking"
                  value={convertForm.checker}
                  onChange={(e) => setConvertForm({ ...convertForm, checker: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Service Amount (₹)</label>
                  <input
                    type="number"
                    required
                    max={getOfferOutstanding(selectedOffer)}
                    value={convertForm.amount}
                    onChange={(e) => setConvertForm({ ...convertForm, amount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">Max: {formatCurrency(getOfferOutstanding(selectedOffer))}</p>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">TDS Amount (₹)</label>
                  <input
                    type="number"
                    value={convertForm.tdsAmount}
                    onChange={(e) => setConvertForm({ ...convertForm, tdsAmount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Conversion Remarks</label>
                <textarea
                  rows={2}
                  value={convertForm.remark}
                  onChange={(e) => setConvertForm({ ...convertForm, remark: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConvertOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {saving ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
