import { API_URL, getToken } from "@/lib/auth";

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      errorMsg = data.message || data.error || errorMsg;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

export const repairApi = {
  get: async (endpoint: string, params?: Record<string, string>) => {
    const url = new URL(`${API_URL}/repair/${endpoint.replace(/^\//, '')}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value);
        }
      });
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  post: async (endpoint: string, data?: any) => {
    const res = await fetch(`${API_URL}/repair/${endpoint.replace(/^\//, '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse(res);
  },
  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_URL}/repair/${endpoint.replace(/^\//, '')}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}/repair/${endpoint.replace(/^\//, '')}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    const json = await res.json();
    return json.url || json.data?.url || '';
  }
};
