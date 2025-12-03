import React, { useState, useEffect } from 'react';

interface QRCodeDisplayProps {
  qrCodeUrl: string;
  secret?: string;
  alt?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeUrl,
  secret,
  alt = 'QR Code',
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    if (!qrCodeUrl) {
      setImageError(true);
      return;
    }

    // Handle different URL formats
    let processedUrl = qrCodeUrl.trim();

    // If it's already a data URL (starts with data:), use it as is
    if (processedUrl.startsWith('data:')) {
      setImageSrc(processedUrl);
      setImageError(false);
      return;
    }

    // If it's a base64 string without data URL prefix, convert it
    // Check if it looks like base64 (alphanumeric, +, /, = characters)
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    if (base64Pattern.test(processedUrl) && processedUrl.length > 100) {
      // Assume it's a PNG base64 string
      processedUrl = `data:image/png;base64,${processedUrl}`;
      setImageSrc(processedUrl);
      setImageError(false);
      return;
    }

    // If it's a relative URL and doesn't start with http, prepend API base URL
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      // Check if it starts with a slash (absolute path from API)
      if (processedUrl.startsWith('/')) {
        processedUrl = `${import.meta.env.VITE_API_URL}${processedUrl}`;
      } else {
        // Relative path
        processedUrl = `${import.meta.env.VITE_API_URL}/${processedUrl}`;
      }
    }

    setImageSrc(processedUrl);
    setImageError(false);
  }, [qrCodeUrl]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
        {imageError || !imageSrc ? (
          <div className="w-64 h-64 flex flex-col items-center justify-center bg-gray-100 rounded">
            <p className="text-gray-500 text-sm mb-2">Failed to load QR code</p>
            {qrCodeUrl && (
              <p className="text-xs text-gray-400 break-all px-2 text-center">
                URL: {qrCodeUrl.substring(0, 50)}...
              </p>
            )}
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={alt}
            className="w-64 h-64 object-contain"
            onError={() => {
              console.error('QR code image failed to load:', imageSrc);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('QR code image loaded successfully:', imageSrc);
              setImageError(false);
            }}
          />
        )}
      </div>
      {secret && (
        <div className="w-full max-w-md">
          <p className="text-sm text-gray-600 mb-2 font-sf">
            Manual Entry Secret:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <code className="text-sm font-mono text-gray-800 break-all font-sf">
              {secret}
            </code>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-sf">
            Use this code if you cannot scan the QR code
          </p>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;

