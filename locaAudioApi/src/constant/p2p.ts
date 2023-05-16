export const roomId = 1;

export const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // {
    //   urls: 'turn:8.134.67.109:3478',
    //   username: 'cyd',
    //   credential: '123123',
    // },
    // {
    //   urls: 'turns:8.134.67.109:5349',
    //   username: 'cyd',
    //   credential: '123123',
    // },
    {
      urls: 'turn:111.230.110.43:3478',
      username: 'cyd-demo',
    },
  ],
};
