import { useEffect, useRef, useState } from 'react';
import { createSocket } from '../../core/Socket';
import { Socket } from 'socket.io-client';
import { Button, Input, message } from 'antd';
import { getLocalUserMedia } from '../../utils';
import axios from 'axios';

const userId = 'cyd6666';
const roomId = '1111';

export default function SRSPage() {
  const [streamId, setStreamId] = useState('');
  const [scanUrlFlv, setScanUrlFlv] = useState('');
  const [scanUrlHls, setScanUrlHls] = useState('');
  const socket = useRef<Socket>();
  const [userList, setUserList] = useState<string[]>([]);
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  /** pc实例 */
  const localRtcPc = useRef<RTCPeerConnection>();

  useEffect(() => {
    socket.current = createSocket({ roomId, userId });

    socket.current.on('connect', () => {
      console.log('已连接');
      // 添加Ws 回调
      addWSCallback();
      socket.current?.emit('roomUserList', { roomId });
    });
  }, []);

  /** 添加ws回调 */
  const addWSCallback = () => {
    // 发送者 只监听回复就好了
    // socket.current!.on('msg', async (res) => {
    //   const user = res?.data?.userId;
    //   const pc = rtcMpc.current.get(user);
    //   if (res.type === 'candidate') {
    //     try {
    //       const candidate = res.data.candidate;
    //       await pc?.addIceCandidate(candidate);
    //     } catch (error) {}
    //   }

    //   if (res.type === 'offer') {
    //     const offer = res.data.offer;
    //     // 接受到链接请求 设置远程
    //     await pc?.setRemoteDescription(offer);
    //     // 创建回复
    //     const answer = await pc?.createAnswer();
    //     await pc?.setLocalDescription(answer);
    //     //并通过信令服务器发送给A
    //     let params = {
    //       targetUid: user,
    //       userId,
    //       answer: answer,
    //     };
    //     socket.current!.emit('answer', params);
    //   }

    //   if (res.type === 'answer') {
    //     const answer = res.data.answer;
    //     // 接受到链接请求 设置远程
    //     await pc?.setRemoteDescription(answer);
    //   }

    //   if (res.type === 'join') {
    //     setUserList((val) => [...new Set([...val, user])]);
    //   }
    //   if (res.type === 'leave') {
    //     setUserList((val) => val.filter((item) => item !== user));
    //     rtcMpc.current.delete(user);
    //   }
    // });

    socket.current!.on('roomUserList', async (res) => {
      const allUsers: string[] = res?.map((item: any) => item.userId) || [];
      setUserList((val) => [...new Set([...val, ...allUsers])]);
    });
  };

  const setDomVideoStream = (newStream: any) => {
    const video = localVideoRef.current;
    if (!video) return;
    const stream = video.srcObject as any;
    if (stream) {
      stream.getTracks().forEach((e: any) => e.stop());
    }
    video.srcObject = newStream;
    video.muted = true;
    video.autoplay = true;
  };

  const getPushSdp = async (stream: any) => {
    const pc = new RTCPeerConnection();
    localRtcPc.current = pc;
    pc.addTransceiver('audio', { direction: 'sendonly' });
    pc.addTransceiver('video', { direction: 'sendonly' });
    stream.getTracks().forEach(function (track: any) {
      pc.addTrack(track);
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const data = {
      api: 'https://111.230.110.43/rtc/v1/publish/',
      streamurl: 'webrtc://111.230.110.43/live/' + streamId,
      sdp: offer.sdp,
    };
    axios
      .post('https://111.230.110.43/rtc/v1/publish/', data)
      .then(async (res: any) => {
        res = res.data;
        console.log(res);
        if (res.code === 0) {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: res.sdp })
          );
          //按照给是组装flv和hls点播地址 （SRS官网指定格式）
          setScanUrlFlv('https://111.230.110.43/live/' + streamId + '.flv');
          setScanUrlHls('https://111.230.110.43/live/' + streamId + '.m3u8');
          //推流成功后直接webrtc拉流预览 如果拉流这个步骤还没学的话等学完下节课再看这里
          // that.preLive()
        } else {
          message.error('推流失败请重试');
        }
      })
      .catch((err) => {
        console.error('SRS 推流异常', err);
        message.error('推流异常，请检查流媒体服务器');
      });
  };

  const handleOpen = async () => {
    if (!streamId) {
      message.error('房间号不能为空');
      return;
    }
    // 开启摄像头
    const localStream = await getLocalUserMedia({
      audio: true,
      video: true,
    });

    setDomVideoStream(localStream);
    await getPushSdp(localStream);
  };

  return (
    <div>
      <div>
        <Input
          onChange={(e) => setStreamId(e.target.value)}
          value={streamId}
          placeholder="请输入房间号"
        />

        <Button onClick={handleOpen}> 开启直播</Button>
      </div>
      <video ref={localVideoRef} controls width="700px" height="450px" />
      <div>
        <span>当前流ID {streamId}</span>
        <span>FLV地址： {scanUrlFlv}</span>
        <span>HLS地址： {scanUrlHls}</span>
      </div>
    </div>
  );
}
