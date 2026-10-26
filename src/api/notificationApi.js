import { http } from './http';

export const notificationApi = {
  getAll: () => http.get('/notifications'),
  create: (notif) => http.post('/notifications', notif),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch('/notifications/read-all'),
};
