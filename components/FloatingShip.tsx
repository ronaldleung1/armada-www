'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import gsap from 'gsap';

const FloatingShip = () => {
    const shipRef = useRef<HTMLImageElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const element = shipRef.current;
        if (!element) return;

        let animation: gsap.core.Tween;

        if (isHovered) {
            animation = gsap.to(element, {
                duration: 12,
                repeat: -1,
                ease: "none",
                y: 360,
                rotation: 180,
                modifiers: {
                    y: y => Math.sin(parseFloat(y) * .125) * 10 + "px",
                    rotation: r => Math.sin(parseFloat(r) * .125) * 4 + "deg"
                }
            });
        }

        return () => {
            if (animation) {
                animation.kill();
                gsap.to(element, {
                    duration: 0.5,
                    y: 0,
                    rotation: 0
                });
            }
        };
    }, [isHovered]);

    return (
        <div
            className="w-[180px] h-[38px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Image
                ref={shipRef}
                src="/ship.png"
                alt="Armada Logo"
                width={180}
                height={38}
                priority
                style={{ transform: 'rotate(0deg)' }}
            />
        </div>
    );
};

export default FloatingShip; 