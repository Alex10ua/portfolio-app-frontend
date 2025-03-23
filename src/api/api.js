import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://portfolio-backend:8080/api/v1/', // base URL for all requests
    timeout: 10000, // optional timeout in milliseconds
});

export default apiClient;