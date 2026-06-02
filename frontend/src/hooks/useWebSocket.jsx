import { useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../api/client';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export function useWebSocket() {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const { addNotification, setUnreadCount, setWsConnected } = useNotificationStore();
  const { accessToken, isAuthenticated } = useAuthStore();

  const connect = useCallback(() => {
    if (!isAuthenticated() || !accessToken) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('access_token');
    ws.current = new WebSocket(`${WS_URL}/ws/notifications/?token=${token}`);

    ws.current.onopen = () => {
      setWsConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') {
          setUnreadCount(data.unread);
        } else if (data.type === 'notification') {
          addNotification({
            id: data.id,
            type: data.notif_type,
            title: data.title,
            message: data.message,
            object_type: data.object_type,
            object_id: data.object_id,
            created_at: data.created_at,
            is_read: false,
          });
          // Toast popup
          toast.custom((t) => (
            <div className={`notif-toast ${t.visible ? 'notif-toast--in' : ''}`}>
              <div className="notif-toast__dot" />
              <div>
                <div className="notif-toast__title">{data.title}</div>
                <div className="notif-toast__msg">{data.message}</div>
              </div>
            </div>
          ), { duration: 5000, position: 'bottom-right' });
        }
      } catch { /* ignore */ }
    };

    ws.current.onclose = () => {
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connect, 4000);
    };

    ws.current.onerror = () => ws.current?.close();
  }, [accessToken]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { send };
}
