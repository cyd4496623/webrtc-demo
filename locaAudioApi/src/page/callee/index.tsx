import { Button } from 'antd';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { config, roomId } from '../../constant/p2p';
import { createSocket } from '../../core/Socket';
import { getLocalUserMedia } from '../../utils';

const Callee = () => {
  const targetUid = 'yunda';
  const userId = '韵达';
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
      addWSCallback();
    });
  }, []);

  /** 添加ws回调 */
  const addWSCallback = () => {
    // 链接
    socket.current!.on('msg', async (res) => {
      console.log('res', res);
      if (res.type === 'candidate') {
        try {
          const candidate = res.data.candidate;
          await localRtcPc.current?.addIceCandidate(candidate);
        } catch (error) {}
      }

      if (res.type === 'offer') {
        // 接受到链接请求 设置远程
        await localRtcPc.current?.setRemoteDescription(res.data.offer);
        // 创建回复
        const answer = await localRtcPc.current?.createAnswer();

        await localRtcPc.current?.setLocalDescription(answer);
        //并通过信令服务器发送给A
        let params = {
          targetUid,
          userId,
          answer: answer,
        };
        socket.current!.emit('answer', params);
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
    // 本地播放流数据
    localVideoRef.current!.srcObject = localStream;
    // 将本地视频流的轨道添加到RTCPeerConnection中
    localStream.getTracks().forEach((track) => {
      localRtcPc.current!.addTrack(track, localStream);
    });

    // 添加pc 回调
    onPcEvent();
  };

  const onPcEvent = () => {
    const pc = localRtcPc.current;
    if (!pc) return;
    // 接收到远端信令的回调
    pc.ontrack = function (event) {
      // 播放远端的流
      remoteVideoRef.current!.srcObject = event.streams[0];
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

  return (
    <div>
      <div>
        <Button onClick={init}>初始化开始摄像头</Button>
      </div>
      <video
        ref={localVideoRef}
        autoPlay
        // muted
        style={{ width: '50%', height: 'auto' }}
      />

      <video
        ref={remoteVideoRef}
        autoPlay
        // muted
        style={{ width: '50%', height: 'auto' }}
      />
    </div>
  );
};

export default Callee;
