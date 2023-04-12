export const getLocalUserMedia = (param: MediaStreamConstraints) => {
  return navigator.mediaDevices.getUserMedia(param);
};
