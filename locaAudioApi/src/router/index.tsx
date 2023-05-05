import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import 'webrtc-adapter';
import PTP from '../App';
import PTP2 from '../App';
import Caller from '../page/caller';
import Callee from '../page/callee';
import C from '../page/C';

import Back from '../page/imaginaryBck';
import A from '../page/A';
import B from '../page/B';
import Home from '../page/Home';
import WebAipPage from '../page/WebApi';
import DemoA from '../page/Demo-A';
import DemoB from '../page/Demo-B';
import JanusTest from '../page/Janus';
const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/demo-a',
    element: <DemoA />,
  },
  {
    path: '/demo-b',
    element: <DemoB />,
  },
  {
    path: '/room',
    element: <JanusTest />,
  },
  {
    path: '/ptp1',
    element: <PTP isCaller userId="1001" roomId="1" />,
  },
  {
    path: '/ptp',
    element: <PTP2 userId="1002" roomId="1" />,
  },
  {
    path: '/caller',
    element: <Caller />,
  },
  {
    path: '/callee',
    element: <Callee />,
  },
  {
    path: '/a',
    element: <A />,
  },
  {
    path: '/b',
    element: <B />,
  },
  {
    path: '/c',
    element: <C />,
  },
  {
    path: '/back',
    element: <Back />,
  },
  {
    path: '/api',
    element: <WebAipPage />,
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
