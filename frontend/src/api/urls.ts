import axios from 'axios';

const API_BASE = import.meta.env.VITE_URL_SERVICE_URL || '';

export async function shortenUrl(url: string, alias: string | undefined, expiresIn: string | undefined, token: string) {
  const response = await axios.post(
    `${API_BASE}/shorten`,
    { url, alias, expiresIn },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export async function getUserUrls(token: string) {
  const response = await axios.get(`${API_BASE}/urls`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteUrl(code: string, token: string) {
  await axios.delete(`${API_BASE}/urls/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
