import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { myStorage } from '@extension/storage';
import React, { useState, useEffect } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

const Popup = () => {
  const { theme, userId, documents } = useStorage(myStorage);
  const isLight = true;
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDocumentsIfAuthenticated = async () => {
      if (userId) {
        await fetchDocuments();
      }
    };

    fetchDocumentsIfAuthenticated();
  }, [userId]);

  useEffect(() => {
    // Load selected documents from storage when the component mounts
    const loadSelectedDocuments = async () => {
      const storedSelectedDocuments = await myStorage.getSelectedDocuments();
      setSelectedDocuments(storedSelectedDocuments);
    };

    loadSelectedDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      await myStorage.fetchDocuments();
      setAuthError(null); // Clear any previous errors on successful fetch
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setAuthError('Failed to fetch documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = () => {
    setAuthError(null);
    chrome.runtime.sendMessage({ action: 'startAuthentication' }, response => {
      if (chrome.runtime.lastError) {
        console.error('Authentication failed:', chrome.runtime.lastError);
        setAuthError('Authentication failed. Please try again.');
      }
    });
  };

  const handleDocumentSelect = (id: string) => {
    setSelectedDocuments(prev => (prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]));
  };

  useEffect(() => {
    // Update selected documents in storage whenever user selects or deselects documents
    myStorage.setSelectedDocuments(selectedDocuments);
  }, [selectedDocuments]);

  return (
    <div className={`App ${isLight ? 'bg-slate-50' : 'bg-gray-800'}`}>
      <header className={`App-header ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        <img src={chrome.runtime.getURL('popup/logo.svg')} className="App-logo-small" alt="logo" />
        <h1 className="text-xl font-bold mb-4">EasyApply Extension</h1>
      </header>
      {/* Add userId display here */}
      {userId && <p className={`text-center mb-4 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>User ID: {userId}</p>}
      <div className={`container ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
        {userId ? (
          <div>
            <h2 className="text-lg font-semibold mb-2">Your Documents</h2>
            {isLoading ? (
              <p>Loading documents...</p>
            ) : documents.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200 text-gray-700">
                    <th className="p-2 text-left">Select</th>
                    <th className="p-2 text-left">Document Name</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b border-gray-300">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={() => handleDocumentSelect(doc.id)}
                        />
                      </td>
                      <td className="p-2">{doc.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No documents found.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="mb-4">Please authenticate to use the extension.</p>
            <ActionButton onClick={handleAuthenticate}>Authenticate</ActionButton>
            {authError && <p className="text-red-500 mt-2">{authError}</p>}
          </div>
        )}
      </div>
      <footer className="mt-4"></footer>
    </div>
  );
};

const ActionButton = (props: ComponentPropsWithoutRef<'button'>) => {
  const { theme } = useStorage(myStorage);
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
