import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import NotSupported from '../app/(screens)/NotSupported';

export default function IOSOnlyWrapper({ children }: { children: React.ReactNode }) {
  const [isIOSWeb, setIsIOSWeb] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      setIsIOSWeb(isIOS);
    } else {
      // Not web
      setIsIOSWeb(true); // allow on native iOS/Android
    }
  }, []);

  if (isIOSWeb === null) return null; // Or a loading spinner

  return isIOSWeb ? <>{children}</> : <NotSupported />;
}
