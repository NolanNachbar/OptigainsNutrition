import React, { useEffect, useRef } from 'react';
import { useZxing } from "react-zxing";

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onClose }) => {
  const hasScanned = useRef(false);

  const { ref } = useZxing({
    onDecodeResult: (result) => {
      // Prevent multiple scans of the same barcode
      if (!hasScanned.current) {
        hasScanned.current = true;
        const barcode = result.getText();
        console.log('Scanned barcode:', barcode);
        
        // Vibrate on successful scan (if supported)
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
        
        onResult(barcode);
      }
    },
    constraints: {
      video: {
        facingMode: 'environment', // Use back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    }
  });

  useEffect(() => {
    // Request camera permissions
    navigator.mediaDevices.getUserMedia({ video: true })
      .catch((err) => {
        console.error('Camera permission denied:', err);
        alert('Camera permission is required to scan barcodes. Please allow camera access and try again.');
        onClose();
      });

    // Cleanup function
    return () => {
      // Stop all video streams when component unmounts
      const videoElement = document.querySelector('video');
      if (videoElement?.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="text-white text-2xl"
          aria-label="Close scanner"
        >
          ×
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video 
          ref={ref as any}
          className="w-full h-full object-cover"
        />
        
        {/* Scanning Frame Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Scanning box */}
            <div className="w-64 h-32 border-2 border-white opacity-50">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500"></div>
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500"></div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500"></div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500"></div>
            </div>
            {/* Scanning line animation */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 animate-scan"></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4">
          <p className="text-white text-center">
            Position the barcode within the frame
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;