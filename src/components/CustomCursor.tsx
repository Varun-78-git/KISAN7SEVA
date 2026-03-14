import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'motion/react';

const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Spring physics for smooth trailing
  const springConfig = { damping: 25, stiffness: 200 };
  const outerX = useSpring(0, springConfig);
  const outerY = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      outerX.set(e.clientX);
      outerY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('button') || 
        target.closest('a') ||
        target.getAttribute('role') === 'button'
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [outerX, outerY, isVisible]);

  // Hide on mobile (touch devices)
  if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return null;
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Outer Circle */}
      <motion.div
        style={{
          x: outerX,
          y: outerY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 2 : 1,
          backgroundColor: isHovering ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
          borderColor: isHovering ? 'rgb(16, 185, 129)' : 'rgba(0, 0, 0, 0.3)',
        }}
        className="w-8 h-8 rounded-full border border-black/30 absolute top-0 left-0 transition-colors duration-300"
      />
      
      {/* Inner Dot */}
      <motion.div
        animate={{
          x: mousePosition.x,
          y: mousePosition.y,
          translateX: '-50%',
          translateY: '-50%',
          scale: isHovering ? 0.5 : 1,
          backgroundColor: isHovering ? 'rgb(16, 185, 129)' : 'rgb(0, 0, 0)',
        }}
        transition={{ type: 'tween', ease: 'linear', duration: 0 }}
        className="w-1.5 h-1.5 rounded-full absolute top-0 left-0 transition-colors duration-300"
      />
    </div>
  );
};

export default CustomCursor;
