import { Button, Input } from 'antd';
import axios from 'axios';
import { useRef, useState } from 'react';

export default function PullPage() {
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [roomId, setRoomId] = useState('');
  /** pc实例 */
  const localRtcPc = useRef<RTCPeerConnection>();

  const handleClick = async () => {
    const pc = new RTCPeerConnection();
    localRtcPc.current = pc;
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.ontrack = function (e) {
      setDomVideoTrick(e.track);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    let data = {
      api: 'http://111.230.110.43:1985/' + 'rtc/v1/play/',
      streamurl: 'webrtc://111.230.110.43:8085/live/' + roomId,
      sdp: offer.sdp,
    };

    axios
      .post('http://111.230.110.43:1985/' + 'rtc/v1/play/', data)
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
