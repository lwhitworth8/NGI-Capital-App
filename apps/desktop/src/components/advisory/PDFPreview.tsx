"use client";

import { useEffect, useRef, useState } from 'react';

interface PDFPreviewProps {
  src: string;
  className?: string;
  alt?: string;
}

export function PDFPreview({ src, className = "", alt = "PDF Preview" }: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPDFPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('PDFPreview: Starting to load PDF from:', src);

        // Load PDF.js from CDN
        if (!window.pdfjsLib) {
          console.log('PDFPreview: Loading PDF.js from CDN...');
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
              console.log('PDFPreview: PDF.js loaded successfully');
              resolve();
            };
            script.onerror = () => {
              console.error('PDFPreview: Failed to load PDF.js');
              reject(new Error('Failed to load PDF.js'));
            };
            document.head.appendChild(script);
          });
        } else {
          console.log('PDFPreview: PDF.js already loaded');
        }

        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        console.log('PDFPreview: Loading PDF document...');
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({
          url: src,
          withCredentials: false,
          httpHeaders: {}
        });

        const pdfDoc = await loadingTask.promise;
        console.log('PDFPreview: PDF document loaded, pages:', pdfDoc.numPages);

        if (!mounted) return;

        // Get first page
        console.log('PDFPreview: Getting first page...');
        const page = await pdfDoc.getPage(1);
        
        // Wait for canvas to be available
        let canvas = canvasRef.current;
        let attempts = 0;
        while (!canvas && attempts < 10) {
          console.log('PDFPreview: Waiting for canvas to be available, attempt:', attempts + 1);
          await new Promise(resolve => setTimeout(resolve, 100));
          canvas = canvasRef.current;
          attempts++;
        }
        
        if (!canvas) {
          console.error('PDFPreview: Canvas ref is still null after waiting');
          setError('Canvas not available');
          setLoading(false);
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          console.error('PDFPreview: Could not get canvas context');
          return;
        }

        // Get the container dimensions to fill the space properly
        const container = canvas.parentElement;
        const containerWidth = container?.clientWidth || 256;
        const containerHeight = container?.clientHeight || 144;
        
        // Calculate scale to fill the container perfectly (cover mode)
        const viewport = page.getViewport({ scale: 1 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.max(scaleX, scaleY); // Use max to fill the container completely
        
        const scaledViewport = page.getViewport({ scale });

        console.log('PDFPreview: Container size:', containerWidth, 'x', containerHeight);
        console.log('PDFPreview: PDF viewport:', viewport.width, 'x', viewport.height);
        console.log('PDFPreview: Scale:', scale, 'Scaled viewport:', scaledViewport.width, 'x', scaledViewport.height);

        // Set canvas size to match the container
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Fill background with white
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate centering offset to center the PDF within the container
        const offsetX = (canvas.width - scaledViewport.width) / 2;
        const offsetY = (canvas.height - scaledViewport.height) / 2;

        // Render page centered
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
          transform: [1, 0, 0, 1, offsetX, offsetY] // Center the content
        };

        console.log('PDFPreview: Starting page render with offset:', offsetX, offsetY);
        await page.render(renderContext).promise;
        console.log('PDFPreview: Page render completed');

        setLoading(false);
      } catch (err: any) {
        console.error('PDF preview error:', err);
        if (mounted) {
          setError(err.message || 'Failed to load PDF preview');
          setLoading(false);
        }
      }
    };

    loadPDFPreview();

    return () => {
      mounted = false;
    };
  }, [src]);

  return (
    <div className={`relative ${className}`}>
      {/* Always render canvas but hide it while loading */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${loading ? 'opacity-0' : 'opacity-100'}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500">Loading PDF...</div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-gray-500">PDF Preview</div>
        </div>
      )}
    </div>
  );
}

// Declare global PDF.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}
