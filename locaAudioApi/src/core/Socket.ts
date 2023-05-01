import io, { Socket } from 'socket.io-client';

export const createSocket = (query: Record<string, any>): Socket => {
  return io('https://8.134.67.109:18080', {
    reconnectionDelayMax: 10000,
    transports: ['websocket'],
    query,
  });
};
