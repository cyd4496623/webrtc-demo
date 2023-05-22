import { Button, Input, message } from 'antd';
import axios from 'axios';
import { useRef, useState } from 'react';

export default function PullPage() {
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [roomId, setRoomId] = useState('');
  /** pc实例 */
  const localRtcPc = useRef<RTCPeerConnection>();

  const handleClick = async () => {
    if (!roomId) {
      message.error('房间号不能为空');
      return;
    }
    const pc = new RTCPeerConnection();
    localRtcPc.current = pc;
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.addTransceiver('video', { direction: 'recvonly' });
    onPcEvent(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    let data = {
      api: 'https://111.230.110.43/' + 'rtc/v1/play/',
      streamurl: 'webrtc://111.230.110.43/live/' + roomId,
      sdp: offer.sdp,
    };

    axios
      .post('https://111.230.110.43/' + 'rtc/v1/play/', data)
      .then(async (res: any) => {
        res = res.data;
        console.log(res);
        if (res.code === 0) {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp: res.sdp })
          );
        }
      })
      .catch((err) => {
        console.error('SRS 拉流异常', err);
      });
  };

  const onPcEvent = (pc: RTCPeerConnection) => {
    pc.ontrack = function (e) {
      setDomVideoTrick(e.track);
    };

    // pc.ondatachannel = function (ev) {
    //   console.log('房间号' + roomId + ' 数据通道创建成功');
    //   ev.channel.onopen = function () {
    //     console.log('房间号' + roomId + ' 数据通道打开');
    //   };
    //   ev.channel.onmessage = function (data) {
    //     console.log('房间号' + roomId + ' 数据通道消息', data.data);
    //     // 弹幕上屏幕
    //   };
    //   ev.channel.onclose = function () {
    //     console.log('房间号' + roomId + ' 数据通道关闭');
    //   };
    // };
  };

  const setDomVideoTrick = (trick: any) => {
    const video = localVideoRef.current;
    if (!video) return;
    let stream = video.srcObject as any;
    if (stream) {
      stream.addTrack(trick);
    } else {
      stream = new MediaStream();
      stream.addTrack(trick);
      video.srcObject = stream;
      video.controls = true;
      video.autoplay = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.muted = true;
    }
  };

  return (
    <div>
      <div>
        <Input
          placeholder="请输入房间号"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <Button onClick={handleClick}>点击我进行拉流</Button>
      </div>
      <video ref={localVideoRef} controls width="700px" height="450px" />
    </div>
  );
}
