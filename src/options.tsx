import { createRoot } from 'react-dom/client';
import { OptionsApp } from './options/OptionsApp';
import './index.css';

const root = createRoot(document.querySelector('#root') as HTMLElement);
root.render(<OptionsApp />);
