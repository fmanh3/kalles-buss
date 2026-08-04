const isProd = window.location.hostname !== 'localhost';
export const API_URL = isProd ? 'https://kalles-bff-w7fsmra4yq-ew.a.run.app/api' : '/api';
