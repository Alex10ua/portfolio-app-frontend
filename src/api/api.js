import axios from 'axios';

const apiUrl = "/api/v1/";

const apiClient = axios.create({
    baseURL: apiUrl, // base URL for all requests
    timeout: 10000, // optional timeout in milliseconds
});

export default apiClient;