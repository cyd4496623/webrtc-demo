import { Button } from 'antd';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { config, roomId } from '../../constant/p2p';
import { createSocket } from '../../core/Socket';
import { getLocalUserMedia } from '../../utils';

const Caller = () => {
  const userId = 'yunda';
  const targetUid = '韵达';
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  /** 远端video */
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  /** pc实例 */
  const localRtcPc = useRef<RTCPeerConnection>();

  const socket = useRef<Socket>();

  useEffect(() => {
    socket.current = createSocket({ roomId, userId });

    socket.current.on('connect', () => {
      console.log('已连接');
      // 添加Ws 回调
      addWSCallback();
    });
  }, []);

  /** 添加ws回调 */
  const addWSCallback = () => {
    // 发送者 只监听回复就好了
    socket.current!.on('msg', async (res) => {
      console.log('res', res);
      if (res.type === 'answer') {
        // 接受到链接请求 设置远程
        await localRtcPc.current?.setRemoteDescription(res.data.answer);
      }
    });
  };

  const init = async () => {
    //初始化pc
    localRtcPc.current = new RTCPeerConnection(config);
    // 开启摄像头
    const localStream = await getLocalUserMedia({
      audio: true,
      video: true,
    });
    // 把流添加进pc
    localStream.getTracks().forEach((track) => {
      localRtcPc.current?.addTrack(track, localStream);
    });
    // 本地播放流数据
    localVideoRef.current!.srcObject = localStream;

    // 添加pc 回调
    onPcEvent();
  };

  const onPcEvent = () => {
    const pc = localRtcPc.current;
    if (!pc) return;
    // 接收到远端信令的回调
    pc.ontrack = function (event) {
      if (!remoteVideoRef.current) return;

      remoteVideoRef.current.srcObject = event.streams[0];
    };
    // 生成ice回调
    pc.onicecandidate = function (event) {
      if (event.candidate) {
        socket.current!.emit('candidate', {
          targetUid,
          userId,
          candidate: event.candidate,
        });
      }
    };
  };

  const create = async () => {
    //创建offer
    const offer = await localRtcPc.current!.createOffer();
    //设置offer未本地描述
    await localRtcPc.current!.setLocalDescription(offer);
    //发送offer给被呼叫端
    let params = { targetUid, userId, offer: offer };
    socket.current!.emit('offer', params);
  };

  return (
    <div>
      <div>
        <Button onClick={init}>初始化，开始摄像头</Button>
        <Button onClick={create}>创新信令，并发送</Button>
      </div>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        style={{ width: '50%', height: 'auto' }}
      />

      <video
        ref={remoteVideoRef}
        autoPlay
        muted
        style={{ width: '50%', height: 'auto' }}
      />
    </div>
  );
};

export default Caller;
