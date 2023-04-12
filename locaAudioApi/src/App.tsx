import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import 'webrtc-adapter';

import './App.css';
import { getLocalUserMedia } from './utils';

let socket: Socket;
const caller = '1001';
const callee = '1002';

interface Props {
  isCaller?: boolean;
  userId: string;
  roomId: string;
}

function App(props: Props) {
  const { isCaller, userId, roomId } = props;
  const callerId = isCaller ? caller : callee;
  const calleeId = isCaller ? callee : caller;
  const localRtcPc = useRef<RTCPeerConnection>();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  /** 添加ws回调 */
  const addWSCallback = () => {
    socket.on('msg', async (res) => {
      console.log('回调', res);
      if (res.type === 'candidate') {
        if (isCaller) return;
        try {
          const candidate = res.data.candidate;
          console.log('candidate', candidate);
          await localRtcPc.current?.addIceCandidate(candidate);
        } catch (error) {}
      }

      if (res.type === 'offer') {
        if (isCaller) return;

        // 接受到链接请求 设置远程
        await localRtcPc.current?.setRemoteDescription(res.data.offer);
        // 创建恢复
        const answer = await localRtcPc.current?.createAnswer();

        await localRtcPc.current?.setLocalDescription(answer);
        //并通过信令服务器发送给A
        let params = {
          targetUid: calleeId,
          userId: callerId,
          answer: answer,
        };
        socket.emit('answer', params);
      }

      if (res.type === 'answer') {
        // 接受到链接请求 设置远程
        await localRtcPc.current?.setRemoteDescription(res.data.answer);
      }
    });
  };
  /**  ws链接初始化 */
  const handleConcent = () => {
    socket = io('http://localhost:18080', {
      reconnectionDelayMax: 10000,
      transports: ['websocket'],
      query: {
        userId: userId,
        roomId: roomId,
      },
    });
    socket.on('connect', () => {
      console.log('链接成功');
    });
  };

  const handleInitCallerInfo = async () => {
    const config = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    //初始化pc
    localRtcPc.current = new RTCPeerConnection(config);
    //获取本地媒体并添加到pc中
    const localStream = await getLocalUserMedia({
      audio: true,
      video: true,
    });
    localStream.getTracks().forEach((track) => {
      localRtcPc.current?.addTrack(track);
    });
    // 将摄像头视频流放通过video标签播放
    localVideoRef.current!.srcObject = localStream;
    // 添加监听
    await onPcEvent();
  };
  /** 添加监听 */
  const onPcEvent = () => {
    const pc = localRtcPc.current;
    if (!pc) return;
    // const channel = pc.createDataChannel('chat');
    pc.ontrack = function (event) {
      console.log('event.track', event);
      // 远程的信令
      // remoteVideoRef.current!.srcObject = event.track;'
      const video = remoteVideoRef.current;
      const track = event.track;
      if (!video) return;
      let stream = video.srcObject;
      if (stream) {
        stream.addTrack(track);
      } else {
        let newStream = new MediaStream();
        newStream.addTrack(track);
        video.srcObject = newStream;
        video.muted = true;
      }
    };
    // pc.onnegotiationneeded = function (e) {
    //   console.log('重新协商', e);
    // };
    // pc.ondatachannel = function (ev) {
    //   console.log('Data channel is created!');
    // };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', {
          targetUid: calleeId,
          userId: callerId,
          candidate: event.candidate,
        });
      } else {
        /* 在此次协商中，没有更多的候选了 */
        // console.log('在此次协商中，没有更多的候选了');
      }
    };
  };

  const handleCreate = async () => {
    //创建offer
    const offer = await localRtcPc.current!.createOffer();
    //设置offer未本地描述
    await localRtcPc.current!.setLocalDescription(offer);
    //发送offer给被呼叫端
    let params = { targetUid: calleeId, userId: callerId, offer: offer };
    socket.emit('offer', params);
  };

  return (
    <div className="App">
      <div onClick={handleConcent}>点我链接</div>

      <div onClick={addWSCallback}>添加ws回调</div>
      <div style={{ marginTop: 20 }} onClick={handleInitCallerInfo}>
        初始化PC
      </div>
      <div style={{ marginTop: 20 }} onClick={handleCreate}>
        创建链接信令
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
        style={{ width: '50%', height: 'auto' }}
      />
    </div>
  );
}

export default App;
