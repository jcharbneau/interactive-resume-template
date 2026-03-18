import { Suspense, lazy } from 'react';
import resumeConfig from './constants/resume-config.json';

// Lazy-load the heavy Three.js resume component
const InteractiveResume = lazy(() => import('./components/InteractiveResume'));

// Full-screen dark fallback shown while Three.js loads
const bgColor = resumeConfig?.theme?.bgBase ?? '#020808';

export default function App() {
  return (
    <Suspense
      fallback={
        <div style={{ width: '100vw', height: '100vh', background: bgColor }} />
      }
    >
      <InteractiveResume config={resumeConfig} />
    </Suspense>
  );
}
