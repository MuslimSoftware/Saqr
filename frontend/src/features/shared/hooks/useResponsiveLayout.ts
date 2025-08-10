import { useState, useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveLayout {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

export const useResponsiveLayout = (): ResponsiveLayout => {
  const windowDimensions = useWindowDimensions();
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const { width } = windowDimensions;
    
    // On native platforms, default to mobile behavior
    if (Platform.OS !== 'web') {
      setDeviceType('mobile');
      return;
    }

    // Web platform breakpoints
    if (width < BREAKPOINTS.mobile) {
      setDeviceType('mobile');
    } else if (width < BREAKPOINTS.tablet) {
      setDeviceType('tablet');
    } else {
      setDeviceType('desktop');
    }
  }, [windowDimensions]);

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    screenWidth: windowDimensions.width,
    screenHeight: windowDimensions.height,
  };
};