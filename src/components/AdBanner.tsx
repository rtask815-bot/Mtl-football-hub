import React from 'react';
import AdContainer, { AdContainerProps } from './AdContainer.tsx';

export interface AdBannerProps extends AdContainerProps {
  variant?: 'emerald' | 'blue' | 'amber';
  ctaLink?: string;
}

export const AdBanner: React.FC<AdBannerProps> = (props) => {
  return <AdContainer {...props} />;
};

export default AdBanner;
