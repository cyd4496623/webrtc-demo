// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import adapter from 'webrtc-adapter';
import Janus from '../../core/janus.js';
import { Button, Input, message, notification } from 'antd';
import { config } from '../../constant/p2p.js';
let opaqueId = 'videocall-' + Janus.randomString(12);

export default function JanusTest() {
  const videoCallPluginHandle = useRef<any>();

  const [userName, setUserName] = useState('');
  const [targetName, setTargetName] = useState('');
  /** 本地video */
  const localVideoRef = useRef<HTMLVideoElement>(null);
  /** 远端video */
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    initJanus();
  }, []);

  const initJanus = () => {
    Janus.init({
      debug: false,
      dependencies: Janus.useDefaultDependencies({
        adapter: adapter,
      }),
      callback: () => {
        if (!Janus.isWebrtcSupported()) {
          Janus.log('is not Supported Webrtc!');
          return;
        }
      },
    });
    //客户端唯一标识
    console.log('opaqueId', opaqueId);
    // 注册：
    const janus = new Janus({
      server: 'http://8.134.67.109:18088/janus',
      apisecret: 'cydSecret',
      media: {
        video: {
          width: 100, // 限制视频宽度
          height: 100, // 限制视频高度
          frameRate: { max: 5 }, // 限制帧率
        },
        audio: true,
      },
      iceServers: config.iceServers,
      bundlePolicy: 'max-bundle', // 可选项：设置 WebRTC 连接的 Bundle 策略
      rtcpMuxPolicy: 'require', // 可选项：设置 RTCP Mux 策略
      success: function () {
        Janus.log('初始化成功');
        initPlugin(janus);
      },
      error: function (cause) {
        // Error, can't go on...
        Janus.log(cause);
      },
      destroyed: function () {
        // I should get rid of this
        Janus.log('destroyed');
      },
    });
  };
  const getBitrate = () => {
    if (videoCallPluginHandle.current) {
      console.log(videoCallPluginHandle.current.getBitrate());
    }
  };
  const initPlugin = (janus: any) => {
    janus.attach({
      opaqueId,
      plugin: 'janus.plugin.videocall',
      success: function (pluginHandle) {
        //插件初始化成功后 pluginHandle 就是全局句柄，通过 pluginHandle可以操作当前
        //会话的所有功能
        videoCallPluginHandle.current = pluginHandle;
        // console.log("视频呼叫插件初始化成功",videoCallPluginHandle)
      },
      error: function (cause) {
        //插件初始化失败
        console.log('初始化失败', cause);
      },
      onmessage: function (msg, jsep) {
        //msg 交互信息包括挂断 接听等事件监听
        // jsep  协商信令
        // console.log('msg', msg, jsep);
        onMessageForVideoCall(msg, jsep);
      },
      onlocaltrack: function (track: MediaStreamTrack, added) {
        // 本地媒体流发布后可以监听
        console.log('本地媒体', track, added);
        const video = localVideoRef.current;
        if (added === true && video) {
          let stream = video.srcObject;
          if (stream) {
            // @ts-ignore
            stream.addTrack(track);
            return;
          }
          stream = new MediaStream();
          stream.addTrack(track);
          video.srcObject = stream;
          video.controls = false;
          video.autoplay = true;
        }
      },
      onremotetrack: function (track, mid, added) {
        // 远端媒体流
        console.log('远程媒体', track, mid, added);
        const video = remoteVideoRef.current;
        if (video) {
          let stream = video.srcObject;
          if (added === true && stream) {
            // @ts-ignore
            stream.addTrack(track);
            return;
          }
          stream = new MediaStream();
          stream.addTrack(track);
          video.srcObject = stream;
          video.controls = false;
          video.autoplay = true;
        }
      },
      oncleanup: function () {
        // PeerConnection 关闭监听
        // 同时可以创建信的句柄(旧的可用)重新初始化
      },
      detached: function () {
        // PeerConnection 关闭监听
        // 同时可以创建信的句柄（旧的不可用）重新初始化
      },
    });
  };

  const messageNotify = (msg) => {
    notification.warning({
      message: '温馨提示',
      description: msg,
    });
  };
  const controlVideo = () => {
    videoCallPluginHandle.current.send({
      message: { request: 'set', video: true },
    });
  };

  const onMessageForVideoCall = (msg, jsep) => {
    console.log(' ::: Got a message :::', msg);
    var result = msg['result'];
    if (result) {
      if (result['list']) {
        var list = result['list'];
        console.log('注册Peers', list);
      } else if (result['event']) {
        var event = result['event'];
        if (event === 'registered') {
          console.log('注册成功', msg);
          messageNotify('注册成功');
          videoCallPluginHandle.current.send({ message: { request: 'list' } });
        } else if (event === 'calling') {
          console.log('呼叫中');
          messageNotify('呼叫中，请稍后');
        } else if (event === 'incomingcall') {
          let username = result['username'];
          console.log('来自于 【' + username + '】的呼叫');
          videoCallPluginHandle.current.createAnswer({
            jsep: jsep,
            tracks: [
              { type: 'audio', capture: true, recv: true },
              { type: 'video', capture: true, recv: true },
              { type: 'data' },
            ],
            success: function (jsep) {
              Janus.debug('应答 SDP!', jsep);
              var body = { request: 'accept' };
              videoCallPluginHandle.current.send({ message: body, jsep: jsep });
            },
            error: function (error) {
              console.error('创建应答异常', error);
            },
          });
        } else if (event === 'accepted') {
          console.log('对方已接听同时设置协商信息', jsep);
          if (jsep) {
            videoCallPluginHandle.current.handleRemoteJsep({ jsep: jsep });
          }
          messageNotify('对方已接听');
        } else if (event === 'update') {
          // An 'update' event may be used to provide renegotiation attempts
          if (jsep) {
            if (jsep.type === 'answer') {
              videoCallPluginHandle.current.handleRemoteJsep({ jsep: jsep });
            } else {
              videoCallPluginHandle.current.createAnswer({
                jsep: jsep,
                tracks: [
                  { type: 'audio', capture: true, recv: true },
                  { type: 'video', capture: true, recv: true },
                  { type: 'data' },
                ],
                success: function (jsep) {
                  console.log('重新应答信令 SDP!', jsep);
                  var body = { request: 'set' };
                  videoCallPluginHandle.current.send({
                    message: body,
                    jsep: jsep,
                  });
                },
                error: function (error) {
                  console.error(error);
                },
              });
            }
          }
        } else if (event === 'hangup') {
          console.log(
            result['username'] + '已挂断,原因:(' + result['reason'] + ')!'
          );
          videoCallPluginHandle.current.hangup();
          messageNotify('已挂断');
          clearMedia();
        } else if (event === 'simulcast') {
          console.log('联播simulcast，暂时不用考虑', msg);
        }
      }
    } else {
      // 出错
      var error = msg['error'];
      console.log('未知异常', msg);
      messageNotify(error);
      //挂断
      videoCallPluginHandle.current.hangup();
    }
  };

  const clearMedia = () => {
    console.log('挂断的后续的操作');
  };

  const handleRegister = () => {
    const message = { request: 'register', username: userName };
    videoCallPluginHandle.current?.send({ message });
  };

  const handleCall = () => {
    bitrateSet();
    videoCallPluginHandle.current.createOffer({
      //双向语音视频+datachannel
      tracks: [
        { type: 'audio', capture: true, recv: true },
        { type: 'video', capture: true, recv: true, simulcast: false },
        { type: 'data' },
      ],
      success: function (jsep) {
        Janus.debug('呼叫端创建 SDP信息', jsep);
        var body = { request: 'call', username: targetName };
        videoCallPluginHandle.current.send({ message: body, jsep: jsep });
      },
      error: function (error) {
        console.error('呼叫异常', error);
      },
    });
  };

  const bitrateSet = () => {
    videoCallPluginHandle.current.send({
      message: { request: 'set', bitrate: 320 * 240 },
    });
  };

  return (
    <div>
      <div>
        <Input value={userName} onChange={(e) => setUserName(e.target.value)} />
        <Button onClick={handleRegister}>注册</Button>
        <Input
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
        />
        <Button onClick={handleCall}>呼叫</Button>
      </div>
      <div>
        <video ref={localVideoRef} controls muted width={320} height={240} />
      </div>
      <div>
        <video width={320} height={240} ref={remoteVideoRef} muted controls />
      </div>
    </div>
  );
}
