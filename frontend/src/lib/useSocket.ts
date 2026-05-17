import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    // Extract base URL from API URL (e.g., http://host:4000/api -> http://host:4000)
    return process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    if (port === '3000') {
      return `${protocol}//${host}:4000`;
    }
  }
  return 'http://localhost:4000';
};

export function useSocket(room?: string, onEvent?: (event: string, data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = getSocketUrl();
    const socket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Connected to real-time event pipeline');
      if (room) {
        socket.emit('join', room);
      }
    });

    if (onEvent) {
      socket.onAny((event, ...args) => {
        onEvent(event, args[0]);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [room, onEvent]);

  return socketRef.current;
}
