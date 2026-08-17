import { API_URL, getToken } from "@/lib/auth";

const tableRouteMap = {
  "jobcards": "job-cards",
  "actual_production": "actual-production",
  "qc_checkpoints": "qc-checkpoints",
  "costing_response": "costing",
  "sample_test": "sample-test",
  "pi_approval": "pi-approval",
  "management_review": "management-review",
  "full_kitting": "full-kitting",
  "semi_production": "semi-production",
  "semi_job_card": "semi-job-card",
  "semi_actual": "semi-actual",
  "crushing": "crushing",
  "crushing_actual": "crushing",
  "crushing_items": "crushing-items",
  "kyc": "kyc",
  "master": "master",
  "production": "orders",
  "ORDER RECEIPT": "orders",
  "production_tracking_pending": "production-tracking/pending",
  "production_tracking_history": "production-tracking/history",
  "production_tracking_rm_summary": "production-tracking/rm-summary",
  "production_tracking_log": "production-tracking/log",
};

const getRoute = (table) => tableRouteMap[table] || table;

const handleResponse = async (res) => {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // Ignored: probably an HTML 404 fallback page
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

export const productionApi = {
  get: async (table) => {
    const res = await fetch(`${API_URL}/production/${getRoute(table)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  getOne: async (table, id) => {
    const res = await fetch(`${API_URL}/production/${getRoute(table)}/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  post: async (table, data) => {
    const res = await fetch(`${API_URL}/production/${getRoute(table)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  patch: async (table, id, data) => {
    const res = await fetch(`${API_URL}/production/${getRoute(table)}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (table, id) => {
    const res = await fetch(`${API_URL}/production/${getRoute(table)}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    const json = await res.json();
    return json.data?.url || json.url || '';
  }
};
