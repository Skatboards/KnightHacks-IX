import React from 'react';

interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Can be an image URL string (e.g., "/path/to/image.png") or a React SVG element */
  icon?: string | React.ReactNode;
  /** Custom background color (e.g., "#ff5733", "rgb(255,0,0)", or variable) */
  color?: string;
  /** Optional class names to style or size the icon image */
  iconClassName?: string;
  /** Optional inline styles for the icon image */
  iconStyle?: React.CSSProperties;
}

export default function Circlebutton({ 
  icon, 
  color, 
  style, 
  iconClassName, 
  iconStyle, 
  ...props 
}: CircleButtonProps) {
  // Combine custom color prop with any inline styles passed in
  const customStyle: React.CSSProperties = {
    ...(color ? { backgroundColor: color } : {}),
    ...style,
  };

  return (
    <button className="circle-button" style={customStyle} {...props}>
      {typeof icon === 'string' ? (
        <img 
          src={icon} 
          alt="button-icon" 
          className={`circle-button-image ${iconClassName || ''}`} 
          style={iconStyle}
        />
      ) : (
        icon
      )}
    </button>
  );
}