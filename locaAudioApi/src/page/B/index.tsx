import { Button } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { config, roomId } from '../../constant/p2p';
import { createSocket } from '../../core/Socket';
import { getLocalUserMedia } from '../../utils';

const Callee = () => {
  const userId = 'B';
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  /** PC Map */
  const rtcMpc = useRef<Map<string, RTCPeerConnection>>(new Map());

  const socket = useRef<Socket>();

  const [userList, setUserList] = useState<string[]>([]);
  const otherUser = userList.filter((user) => user !== userId);

  useEffect(() => {
    socket.current = createSocket({ roomId, userId });

    socket.current.on('connect', () => {
      console.log('已连接');
      addWSCallback();
      socket.current?.emit('roomUserList', { roomId });
    });
  }, []);

  useEffect(() => {
    init();
  }, [userList]);

  /** 添加ws回调 */
  const addWSCallback = () => {
    socket.current!.on('roomUserList', async (res) => {
      const allUsers: string[] = res?.map((item: any) => item.userId) || [];
      setUserList((val) => [...new Set([...val, ...allUsers])]);
    });
    // 链接
    socket.current!.on('msg', async (res) => {
      const user = res?.data?.userId;
      const pc = rtcMpc.current.get(user);
      if (res.type === 'candidate') {
        try {
          const candidate = res.data.candidate;
          await pc?.addIceCandidate(candidate);
        } catch (error) {}
      }

      if (res.type === 'offer') {
        console.log('user', user);

        const offer = res.data.offer;
        // 接受到链接请求 设置远程
        await pc?.setRemoteDescription(offer);
        // 创建回复
        const answer = await pc?.createAnswer();
        await pc?.setLocalDescription(answer);
        //并通过信令服务器发送给A
        let params = {
          targetUid: user,
          userId,
          answer: answer,
        };
        socket.current!.emit('answer', params);
      }

      if (res.type === 'answer') {
        const answer = res.data.answer;
        // 接受到链接请求 设置远程
        await pc?.setRemoteDescription(answer);
      }

      if (res.type === 'join') {
        setUserList((val) => [...new Set([...val, user])]);
      }
      if (res.type === 'leave') {
        setUserList((val) => val.filter((item) => item !== user));
        rtcMpc.current.delete(user);
      }
    });
  };

  const init = async () => {
    console.log('userList', userList.length);
    // 多少个用户就生成多少 RTCPeerConnection对象
    userList.forEach((userId) => {
      if (rtcMpc.current.get(userId)) return;
      const localRtcPc = new RTCPeerConnection(config);

      rtcMpc.current.set(userId, localRtcPc);
      // 循环添加pc回调
      onPcEvent(localRtcPc, userId);
    });
  };

  const onPcEvent = (pc: RTCPeerConnection, targetUid: string) => {
    if (!pc) return;
    // 接收到远端信令的回调
    pc.ontrack = function (event) {
      const videoDom = document.getElementById(
        `id-${targetUid}`
      ) as HTMLVideoElement;
      if (!videoDom) return;

      videoDom.srcObject = event.streams[0];
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
    for (const userItem of rtcMpc.current) {
      const [targetUid, pc] = userItem;
      if (targetUid === userId) continue;
      console.log('targetUid', targetUid);
      //创建offer
      const offer = await pc.createOffer();
      //设置offer未本地描述
      await pc.setLocalDescription(offer);
      //发送offer给被呼叫端
      let params = { targetUid, userId, offer };
      socket.current!.emit('offer', params);
    }
  };

  /** 开启摄像头 */
  const openCamera = async () => {
    // 开启摄像头
    const localStream = await getLocalUserMedia({
      audio: true,
      video: true,
    });
    for (const userItem of rtcMpc.current) {
      const [targetUid, pc] = userItem;
      if (targetUid === userId) continue;
      // 把流添加进pc
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // 本地播放流数据
    localVideoRef.current!.srcObject = localStream;
  };

  return (
    <div>
      <div>
        <Button onClick={openCamera}>开启摄像头</Button>
        <Button onClick={create}>链接</Button>
      </div>
      <div>
        <video
          ref={localVideoRef}
          autoPlay
          // muted
          style={{ width: '30%', height: 'auto' }}
        />

        {otherUser.map((user) => (
          <video
            key={user}
            id={`id-${user}`}
            autoPlay
            muted
            style={{ width: '30%', height: 'auto' }}
          />
        ))}
      </div>
    </div>
  );
};

export default Callee;
