import { Button } from 'antd';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { config, roomId } from '../../constant/p2p';
import { createSocket } from '../../core/Socket';
import { getLocalUserMedia } from '../../utils';
import Danmaku from 'danmaku';

const Callee = () => {
  const targetUid = 'yunda';
  const userId = '韵达';
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  /** 远端video */
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  /** pc实例 */
  const localRtcPc = useRef<RTCPeerConnection>();

  const wrapperRef = useRef<HTMLDivElement>(null);

  const socket = useRef<Socket>();

  const danmaku = useRef<Danmaku>();

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
    // 初始化弹幕
    initDanmu();
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

    pc.ondatachannel = function (ev) {
      console.log('用户：' + targetUid + ' 数据通道创建成功');
      ev.channel.onopen = function () {
        console.log('用户：' + targetUid + ' 数据通道打开');
      };
      ev.channel.onmessage = function (data) {
        console.log('用户：' + targetUid + ' 数据通道消息', data.data);
        // 弹幕上屏幕
        danmaku.current?.emit({
          text: data.data,
          style: { fontSize: '20px', color: '#ff5500' },
        });
      };
      ev.channel.onclose = function () {
        console.log('用户：' + targetUid + ' 数据通道关闭');
      };
    };
  };

  /** 初始化弹幕 */
  const initDanmu = () => {
    danmaku.current = new Danmaku({
      container: wrapperRef.current!,
      speed: 30,
    });
  };

  return (
    <div>
      <div>
        <Button onClick={init}>初始化开始摄像头</Button>
      </div>
      <div ref={wrapperRef}>
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
    </div>
  );
};

export default Callee;
