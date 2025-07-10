import { useState, useEffect } from 'react';
import { podioAuthService, PodioOAuthState } from '@/services/podio/newPodioAuth';

export const usePodioAuth = () => {
  const [state, setState] = useState<PodioOAuthState>(podioAuthService.getState());

  useEffect(() => {
    const unsubscribe = podioAuthService.subscribe(setState);
    return unsubscribe;
  }, []);

  const initiateOAuth = async (): Promise<string> => {
    return podioAuthService.initiateOAuth();
  };

  const disconnect = async (): Promise<void> => {
    return podioAuthService.disconnect();
  };

  const checkAuthentication = async (): Promise<void> => {
    return podioAuthService.checkAuthentication();
  };

  const callPodioAPI = async (endpoint: string, method: string = 'GET', body?: any): Promise<any> => {
    return podioAuthService.callPodioAPI(endpoint, method, body);
  };

  return {
    ...state,
    initiateOAuth,
    disconnect,
    checkAuthentication,
    callPodioAPI
  };
};