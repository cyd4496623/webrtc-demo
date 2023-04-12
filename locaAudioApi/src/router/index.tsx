import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import PTP from '../App';
import PTP2 from '../App';
import Caller from '../page/caller';
import Callee from '../page/callee';
const router = createBrowserRouter([
  {
    path: '/',
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
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
