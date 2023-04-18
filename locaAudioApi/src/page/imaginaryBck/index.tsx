import { Button } from 'antd';
import { useEffect, useRef } from 'react';
import { getLocalUserMedia } from '../../utils';
import * as SFS from '@mediapipe/selfie_segmentation';
import bg from '../../assets/bg.jpeg';
import duck from '../../assets/duck.jpg';
import { Socket } from 'socket.io-client';
import { createSocket } from '../../core/Socket';
import { config, roomId } from '../../constant/p2p';

const Back = () => {
  const userId = 'yunda';
  const targetUid = '韵达';
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);

  /** 本地video */
  const localBackVideoRef = useRef<HTMLVideoElement>(null);

  /** 远端video */
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  /** pc实例 */
  const localRtcPc = useRef<RTCPeerConnection>();

  const socket = useRef<Socket>();

  /** canvasRef */
  const canvasElement = useRef<HTMLCanvasElement>(null);
  /** Context2D */
  const canvasCtx = useRef<any>();
  /** bg */
  const image = useRef<HTMLImageElement>();

  const selfieSegmentation = useRef<SFS.SelfieSegmentation>();

  const rfId = useRef<number>(0);

  useEffect(() => {
    socket.current = createSocket({ roomId, userId });

    socket.current.on('connect', () => {
      console.log('已连接');
      // 添加Ws 回调
      addWSCallback();
    });
  }, []);

  useEffect(() => {
    initVb();
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

  /** 初始化mediapipe, 添加回调监听 */
  const initVb = () => {
    if (!canvasElement.current) return;
    canvasCtx.current = canvasElement.current.getContext('2d');
    image.current = new Image();
    image.current.src = bg;
    selfieSegmentation.current = new SFS.SelfieSegmentation({
      locateFile: (file) => {
        console.log(file);
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`; //ng  代理模型文件夹
      },
    });
    selfieSegmentation.current.setOptions({
      modelSelection: 1,
      // @ts-ignore
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    selfieSegmentation.current.onResults(handleResults);
  };

  /** 开启摄像头 */
  const openCamera = async () => {
    const localStream = await getLocalUserMedia({
      audio: false,
      video: true,
    });
    // 本地播放流数据
    localVideoRef.current!.srcObject = localStream;
    virtualBg();
  };

  /** 开启虚拟背景 */
  const virtualBg = () => {
    if (!localVideoRef.current) return;
    if (rfId.current) {
      cancelAnimationFrame(rfId.current);
    }
    localVideoRef.current.addEventListener('playing', () => {
      if (!localVideoRef.current) return;
      const myvideo = localVideoRef.current;
      let lastTime = 0;
      async function getFrames() {
        const now = myvideo.currentTime;
        if (now > lastTime) {
          await selfieSegmentation.current!.send({ image: myvideo });
        }
        lastTime = now;
        //无限定时循环 退出记得取消 cancelAnimationFrame()
        rfId.current = requestAnimationFrame(getFrames);
      }
      getFrames();
    });
  };

  /** 处理虚拟背景返回结果 */
  const handleResults = (results: any) => {
    if (!canvasElement.current || !image.current) return;
    canvasCtx.current.save();
    const cavWidth = canvasElement.current.width;
    const cavHeight = canvasElement.current.height;
    canvasCtx.current.clearRect(0, 0, cavWidth, cavHeight);
    canvasCtx.current.drawImage(
      results.segmentationMask,
      0,
      0,
      cavWidth,
      cavHeight
    );
    // Draw the image as the new background,
    //and the segmented video on top of that
    canvasCtx.current.globalCompositeOperation = 'source-out';
    canvasCtx.current.drawImage(
      image.current,
      0,
      0,
      image.current.width,
      image.current.height,
      0,
      0,
      cavWidth,
      cavHeight
    );
    canvasCtx.current.globalCompositeOperation = 'destination-atop';
    canvasCtx.current.drawImage(results.image, 0, 0, cavWidth, cavHeight);
    // Done
    canvasCtx.current.restore();
  };

  const onChangeBack = (url: string) => {
    if (!image.current) return;
    image.current.src = url;
  };

  const openVideo = () => {
    const localBackVideo = localBackVideoRef.current!;
    const canvas = canvasElement.current!;
    // 转换视频流
    localBackVideo.srcObject = canvas.captureStream(25);
  };

  const initPc = () => {
    //初始化pc
    localRtcPc.current = new RTCPeerConnection(config);
    const stream = localBackVideoRef.current!.srcObject as MediaStream;
    stream.getTracks().forEach((track) => {
      localRtcPc.current?.addTrack(track, stream);
    });
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
        <Button onClick={openCamera}>初始化，开始摄像头</Button>
        <Button onClick={() => onChangeBack(bg)}>启用默认背景</Button>
        <Button onClick={() => onChangeBack(duck)}>启用小刘鸭背景</Button>
        <Button onClick={openVideo}>开启vido</Button>
        <Button onClick={initPc}>初始化pc</Button>
        <Button onClick={create}>创新信令，并发送</Button>
      </div>
      <video
        ref={localVideoRef}
        autoPlay
        style={{ width: '50%', height: 'auto' }}
      />
      <canvas id="output_canvas" ref={canvasElement} width={300} height={300} />
      <video
        ref={localBackVideoRef}
        autoPlay
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

export default Back;
