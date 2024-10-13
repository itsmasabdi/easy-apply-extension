import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import React, { useState, useEffect } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const { theme, userId } = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Popup: Checking if user is authenticated');
    chrome.storage.local.get(['easyApplyId'], result => {
      console.log('Popup: Storage result:', result);
      if (result.easyApplyId) {
        console.log('Popup: User is authenticated');
        setIsAuthenticated(true);
        exampleThemeStorage.setUserId(result.easyApplyId);
      } else {
        console.log('Popup: User is not authenticated');
      }
    });

    const messageListener = (request: any) => {
      if (request.action === 'authenticationComplete') {
        console.log('Popup: Authentication complete message received');
        setIsAuthenticated(true);
        setAuthError(null);
        exampleThemeStorage.setUserId(request.easyApplyId);
      } else if (request.action === 'authenticationFailed') {
        console.log('Popup: Authentication failed message received');
        setAuthError('Authentication failed. Please try again.');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleAuthenticate = () => {
    console.log('Popup: Authenticate button clicked');
    setAuthError(null);
    chrome.runtime.sendMessage({ action: 'startAuthentication' });
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <img src={chrome.runtime.getURL('popup/logo.svg')} className="App-logo" alt="logo" />
        <ToggleButton>Toggle theme</ToggleButton>
      </header>
      <div className={`container ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <h2>EasyApply Extension</h2>
        {isAuthenticated ? (
          <div>
            <p>You're authenticated!</p>
            {/* Add your authenticated content here */}
          </div>
        ) : (
          <div>
            <p>Please authenticate to use the extension.</p>
            <ActionButton onClick={handleAuthenticate}>Authenticate</ActionButton>
            {authError && <p className="text-red-500">{authError}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const ToggleButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const { theme } = useStorage(exampleThemeStorage);
  const buttonClass = `font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ${
    theme === 'light' ? 'bg-white text-black shadow-black' : 'bg-black text-white'
  }`;

  return (
    <>
      <button className={`${props.className} ${buttonClass}`} onClick={exampleThemeStorage.toggle}>
        {props.children}
      </button>
    </>
  );
};

const ActionButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const { theme } = useStorage(exampleThemeStorage);
  const buttonClass = `font-bold mt-4 py-1 px-4 rounded shadow hover:scale-105 ${
    theme === 'light' ? 'bg-white text-black shadow-black' : 'bg-black text-white'
  }`;

  return (
    <button className={`${props.className} ${buttonClass}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
