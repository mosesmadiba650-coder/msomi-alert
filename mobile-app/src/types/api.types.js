// types/api.types.js
export const ApiEndpoints = {
  DEVICES: {
    REGISTER: '/api/devices/register',
    LIST: '/api/devices',
    UNREGISTER: '/api/devices/unregister'
  },
  NOTIFICATIONS: {
    SEND: '/api/notifications/course',
    HISTORY: '/api/notifications/history',
    STATS: '/api/notifications/stats'
  },
  HEALTH: '/health'
};

export const ApiStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

export const HttpMethods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};
