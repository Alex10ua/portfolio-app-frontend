import axios from 'axios';

const apiUrl = process.env.NODE_ENV === "development"
    ? "http://localhost:8080/api/v1/"
    : "http://portfolio-backend:8080/api/v1/";

const apiClient = axios.create({
    baseURL: apiUrl, // base URL for all requests
    timeout: 10000, // optional timeout in milliseconds
});

export default apiClient;