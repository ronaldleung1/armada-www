'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';

const AnimatedBackButton = () => {
    const shipRef = useRef<HTMLImageElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const element = shipRef.current;
        if (!element) return;

        let animation: gsap.core.Tween;

        if (isHovered) {
            // Animation when hovered - ship moves back and forth infinitely with consistent speed
            animation = gsap.to(element, {
                duration: 1,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut',
                x: -10,
            });
        } else {
            // Reset position when not hovered
            animation = gsap.to(element, {
                duration: 0.5,
                x: 0,
                ease: 'power2.out',
            });
        }

        return () => {
            if (animation) {
                animation.kill();
            }
        };
    }, [isHovered]);

    return (
        <Link
            href='/'
            className='self-start flex items-center gap-3 hover:underline hover:underline-offset-4 py-2'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className='w-[40px] h-[20px] relative overflow-visible flex items-center justify-center'>
                <Image
                    ref={shipRef}
                    src='/ship.png'
                    alt='Back to home'
                    width={40}
                    height={15}
                    className='w-auto h-auto'
                    style={{
                        transformOrigin: 'center',
                        transform: 'scaleX(-1)',
                    }}
                />
            </div>
            <span className='flex items-center'>Back to home</span>
        </Link>
    );
};

export default AnimatedBackButton;
