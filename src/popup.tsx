import { createRoot } from 'react-dom/client';
import { PopupApp } from './popup/PopupApp';
import './index.css';

const root = createRoot(document.querySelector('#root') as HTMLElement);
root.render(<PopupApp />);
