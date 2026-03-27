import { useEffect, useState } from 'react';

/**
 * Hook to detect if WebGL is supported and if it's using hardware acceleration.
 * This is useful for detecting restricted environments (like some corporate proxies/machines)
 * where WebGL might be forced into a slow software-rendering fallback.
 */
export const useWebGLSupport = () => {
  const [support, setSupport] = useState({
    isSupported: true,
    isHardwareAccelerated: true,
    isSoftwareRendered: false,
    renderer: '',
    glVendor: '',
  });

  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
          setSupport({
            isSupported: false,
            isHardwareAccelerated: false,
            isSoftwareRendered: false,
            renderer: 'none',
            glVendor: 'none',
          });
          return;
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

        // Typical software renderers: "SwiftShader", "Mesa Offscreen", "Microsoft Basic Render Driver"
        const softwareRenderers = [
          'SwiftShader',
          'Mesa',
          'Offscreen',
          'Microsoft Basic Render',
          'Software',
        ];

        const isSoftware = softwareRenderers.some((s) => renderer.includes(s));

        setSupport({
          isSupported: true,
          isHardwareAccelerated: !isSoftware,
          isSoftwareRendered: isSoftware,
          renderer,
          glVendor: vendor,
        });
      } catch (_e) {
        setSupport({
          isSupported: false,
          isHardwareAccelerated: false,
          isSoftwareRendered: false,
          renderer: 'error',
          glVendor: 'error',
        });
      }
    };

    checkWebGL();
  }, []);

  return support;
};
