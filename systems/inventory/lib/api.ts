import { API_URL, getToken } from "@/lib/auth";

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMsg);
  }
  return res.json();
};

export const inventoryApi = {
  get: async (endpoint: string, params?: Record<string, string>) => {
    const url = new URL(`${API_URL}/inventory/${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_URL}/inventory/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_URL}/inventory/${endpoint}`, {
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
    const res = await fetch(`${API_URL}/inventory/${endpoint}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    return handleResponse(res);
  },
};
