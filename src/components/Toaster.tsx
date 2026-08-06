import { Toaster as HotToaster } from 'react-hot-toast';
//import env from '../config/env';

export default function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 3500,
        style: {
          background: '#151D2E',
          color: '#F8F9FF',
          border: '1px solid #1E2D45',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxWidth: '360px',
        },
        success: {
          iconTheme: { primary: '#10B981', secondary: '#0A0F1E' },
          style: { border: '1px solid rgba(16,185,129,0.35)' },
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: '#0A0F1E' },
          style: { border: '1px solid rgba(239,68,68,0.35)' },
        },
        loading: {
          iconTheme: { primary: '#A78BFA', secondary: '#0A0F1E' },
        },
      }}
    />
  );
}