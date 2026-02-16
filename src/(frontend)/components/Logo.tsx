import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img 
      src="https://medihub.health/cdn/shop/files/medihub-black_100x.svg?v=1750055106"
      alt="Medihub" 
      className={`object-contain invert ${className || ''}`}
    />
  );
};

export default Logo;