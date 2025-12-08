import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const MobileDetector: React.FC = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if we're on a mobile device
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            const isSmallScreen = window.innerWidth < 768;

            return isMobileDevice || isSmallScreen;
        };

        const mobile = checkMobile();
        setIsMobile(mobile);

        // Check if user has dismissed the banner before
        const dismissed = localStorage.getItem('mobile-banner-dismissed');
        if (mobile && !dismissed) {
            setShowBanner(true);
        }
    }, []);

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('mobile-banner-dismissed', 'true');
    };

    const handleRequestDesktop = () => {
        alert('To enable desktop mode:\n\n1. Tap the menu button (⋮) in Chrome\n2. Check "Desktop site"\n3. Refresh the page\n\nFor the best experience, we recommend using a desktop or laptop computer.');
        handleDismiss();
    };

    if (!showBanner) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
            <div className="flex items-center justify-between p-3 gap-2">
                <div className="flex-1 text-sm">
                    <p className="font-semibold">📱 Mobile Device Detected</p>
                    <p className="text-xs opacity-90 mt-1">
                        For the best experience, please use desktop mode or a computer.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRequestDesktop}
                        className="px-3 py-1.5 bg-white text-blue-600 rounded text-xs font-medium hover:bg-blue-50 whitespace-nowrap"
                    >
                        How to Enable
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 hover:bg-blue-700 rounded"
                        aria-label="Dismiss"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
