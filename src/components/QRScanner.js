import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FaQrcode, FaTimes, FaCheckCircle } from 'react-icons/fa';
import BusPassTemplate from './BusPassTemplate';

function QRScanner() {
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied or not available');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScannedData(null);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Simple QR detection simulation - in real implementation, use a QR library
    // For now, we'll simulate scanning with a button
    return canvas.toDataURL();
  };

  const simulateQRScan = () => {
    // Simulate scanning a QR code with sample data
    const sampleData = {
      name: "Mohammed Faizan N",
      regNo: "6176AC22UC5094",
      route: "ACE TO KRISHNAGIRI",
      validity: "",  // Will be set by the server
      approvedAt: "2025-09-12T15:14:30.166Z",
      branchYear: "B.E/CSE IV",
      dob: "2002-05-15",
      mobile: "9876543210",
      photo: "1757734786412-957329662-pavan passport.jpg", // Use existing photo
      passUrl: "http://localhost:3000/pass/6176AC22UC5094"
    };
    setScannedData(sampleData);
    stopScanning();
  };

  const handleQRData = (data) => {
    try {
      // Try to parse as JSON first
      const parsedData = JSON.parse(data);
      if (parsedData.passUrl) {
        // If it has a passUrl, redirect to the visual bus pass page
        window.location.href = parsedData.passUrl;
        return;
      }
      setScannedData(parsedData);
    } catch (e) {
      // If not JSON, check if it's a URL
      if (data.startsWith('http')) {
        window.location.href = data;
        return;
      }
      // Otherwise treat as plain text
      setScannedData({ rawData: data });
    }
    stopScanning();
  };

  const clearResult = () => {
    setScannedData(null);
    setError('');
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (scannedData) {
    // If it's raw data, show it as text
    if (scannedData.rawData) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200 mt-8"
        >
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="text-lg font-bold text-blue-700">
              <FaCheckCircle style={{ marginRight: 8, color: '#22c55e', verticalAlign: 'middle' }} />
              QR Code Scanned Successfully
            </h2>
            <button
              onClick={clearResult}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg w-full max-w-md">
            <h3 className="font-bold text-gray-800 mb-2">Scanned Data:</h3>
            <p className="text-gray-700 break-all">{scannedData.rawData}</p>
          </div>
        </motion.div>
      );
    }

    // If it's structured data, show the bus pass template
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200 mt-8"
      >
        <div className="flex items-center justify-between w-full mb-4">
          <h2 className="text-lg font-bold text-blue-700">
            <FaCheckCircle style={{ marginRight: 8, color: '#22c55e', verticalAlign: 'middle' }} />
            QR Code Scanned Successfully
          </h2>
          <button
            onClick={clearResult}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <BusPassTemplate studentData={scannedData} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200 mt-8"
    >
      <h2 className="text-lg font-bold text-blue-700 mb-4">
        <FaQrcode style={{ marginRight: 8, color: '#6366f1', verticalAlign: 'middle' }} />
        QR Scanner
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isScanning ? (
        <div className="w-full max-w-md">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-black rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={stopScanning}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Stop Scanning
            </button>
            <button
              onClick={simulateQRScan}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Simulate Scan
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-24 h-24 mb-4 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <FaQrcode className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-gray-600 mb-4">Click to start scanning QR codes</p>
          <button
            onClick={startScanning}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            Start Scanning
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default QRScanner;