import { Button } from 'antd';
import { useRef } from 'react';

export default function WebAipPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream>();

  const handleOpen = async () => {
    const constraints = { video: true, audio: false };
    streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
  };

  const handlePlay = () => {
    if (!localVideoRef.current || !streamRef.current) return;

    localVideoRef.current.srcObject = streamRef.current;
  };

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((track) => {
      track?.stop();
    });
  };
  return (
    <div>
      <Button type="primary" onClick={handleOpen}>
        开启摄像头
      </Button>
      <Button type="primary" onClick={handlePlay}>
        开始播放
      </Button>

      <Button type="primary" onClick={handleClose}>
        关闭
      </Button>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        style={{ width: '30%', height: 'auto' }}
      />
    </div>
  );
}
