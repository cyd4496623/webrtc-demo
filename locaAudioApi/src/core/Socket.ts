import io, { Socket } from 'socket.io-client';

export const createSocket = (query: Record<string, any>): Socket => {
  return io('http://localhost:18080', {
    reconnectionDelayMax: 10000,
    transports: ['websocket'],
    query,
  });
};
