import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import type { ComponentPropsWithoutRef } from 'react';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const { theme, user_id, actions } = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = 'popup/logo.svg';
  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        <ToggleButton>Toggle theme</ToggleButton>
      </header>
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
      <button
        className={`${props.className} ${buttonClass}`}
        onClick={() => exampleThemeStorage.setUserId('66bb3bbff2b62c6928f0c94a')}>
        setUserId
      </button>
      <button className={`${props.className} ${buttonClass}`} onClick={() => exampleThemeStorage.clearActions()}>
        Clear Actions
      </button>
    </>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
