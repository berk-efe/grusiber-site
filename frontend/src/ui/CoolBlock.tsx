// GrowingBorderCard.tsx
import React, { useEffect, useState } from "react";

interface GrowingBorderCardProps {
  children: React.ReactNode;
  duration?: number; // animation duration in ms
}

const GrowingBorderCard: React.FC<GrowingBorderCardProps> = ({
  children,
  duration = 500,
}) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="relative">
      {/* The pseudo-element effect */}
      <div
        className="absolute glass-bg top-0 left-0 border border-primary"
        style={{
          width: 0,
          height: 0,
          animation: `growBorder ${duration}ms forwards`,
        }}
      ></div>

      {/* Content */}
      <div
        className={`relative w-full h-full flex items-center transition-opacity duration-300 ${
          showContent ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </div>

      {/* Keyframes */}
      <style>
        {`
          @keyframes growBorder {
            0% {
              width: 0;
              height: 0;
            }
            100% {
              width: 100%;
              height: 100%;
            }
          }
        `}
      </style>
    </div>
  );
};

export default GrowingBorderCard;
