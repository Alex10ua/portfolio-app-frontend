import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1/',
  withCredentials: true,
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const authAxios = axios.create({ withCredentials: true });

/**
 * Per-call timeouts for requests the backend answers only after a synchronous call to the
 * market-data service. The 10 s default aborted them in the browser while the backend went on
 * to commit — a new-ticker transaction then looked failed, and its retry booked it twice.
 * The backend's own ceilings are 35 s (provider) and 5 min (SEC); these sit just above them.
 */
export const PROVIDER_TIMEOUT_MS = 60_000;
/** SEC EDGAR is paced at ~5 s per request on the Flask side: fundamentals take ~80 s. */
export const SEC_TIMEOUT_MS = 330_000;

export default apiClient;
