import { useEffect, useRef } from 'react';
import anime from 'animejs';

const AnimatedBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const dots: HTMLDivElement[] = [];
    const numDots = window.innerWidth < 768 ? 30 : 50;
    const container = containerRef.current;
    container.innerHTML = '';

    // Create dots
    for (let i = 0; i < numDots; i++) {
      const dot = document.createElement('div');
      dot.className =
        'absolute w-2 h-2 rounded-full bg-black dark:bg-white bg-primary/30';
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      container.appendChild(dot);
      dots.push(dot);
    }

    // Create canvas for lines
    const canvas = document.createElement('canvas');
    canvas.className = 'absolute inset-0 w-full h-full';
    container.insertBefore(canvas, container.firstChild);
    const ctx = canvas.getContext('2d')!;

    const resizeCanvas = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animate dots
    anime({
      targets: dots,
      translateX: () => anime.random(-50, 50),
      translateY: () => anime.random(-50, 50),
      easing: 'easeInOutQuad',
      duration: 3000,
      delay: anime.stagger(150),
      loop: true,
      direction: 'alternate',
    });

    // Draw connecting lines
    const drawLines = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = document.documentElement.classList.contains('dark')
        ? 'rgba(255, 255, 255, 0.5)'
        : 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;

      const containerRect = container.getBoundingClientRect();

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dot1 = dots[i].getBoundingClientRect();
          const dot2 = dots[j].getBoundingClientRect();
          const distance = Math.hypot(
            dot1.x - dot2.x,
            dot1.y - dot2.y
          );

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(
              dot1.x + dot1.width / 2 - containerRect.x,
              dot1.y + dot1.height / 2 - containerRect.y
            );
            ctx.lineTo(
              dot2.x + dot2.width / 2 - containerRect.x,
              dot2.y + dot2.height / 2 - containerRect.y
            );
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(drawLines);
    };

    drawLines();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden transition-colors duration-300"
    />
  );
};

export default AnimatedBackground;
