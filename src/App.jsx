import { Suspense, lazy } from 'react';
import { resolvedConfig } from './constants/resumeConfig';
import { resumeThemes } from './constants/resumeThemes';

// Lazy-load the heavy Three.js resume component
const InteractiveResume = lazy(() => import('./components/resume/InteractiveResume'));

// Resolve background color from the config's theme
const themeId = resolvedConfig?.theme?.resumeThemeId ?? 'midnight';
const bgColor = resumeThemes[themeId]?.bgBase ?? '#020808';

export default function App() {
  return (
    <Suspense
      fallback={
        <div style={{ width: '100vw', height: '100vh', background: bgColor }} />
      }
    >
      <InteractiveResume config={resolvedConfig} />
    </Suspense>
  );
}
