import { useEffect, useState } from 'react';
import { Button } from '@extension/ui';
import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import LoadingSpinner from './spinner';

export default function App() {
  const { theme, user_id } = useStorage(exampleThemeStorage);

  // States for the left button
  const [iconColor, setIconColor] = useState('blue');
  const [isLoading, setIsLoading] = useState(false);

  // States for the active input button
  const [isVisible, setIsVisible] = useState(false);
  const [activeInput, setActiveInput] = useState<HTMLElement | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const [isActiveInputLoading, setIsActiveInputLoading] = useState(false);
  const [activeInputIconColor, setActiveInputIconColor] = useState('blue');

  useEffect(() => {
    console.log('content ui loaded');

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setActiveInput(target);
        updateButtonPosition(target);
        setIsVisible(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const relatedTarget = event.relatedTarget as HTMLElement;

      if (target === activeInput) {
        // Prevent hiding if focus is moving to the button
        if (relatedTarget && relatedTarget.closest('#extension-root')) {
          return;
        }
        setIsVisible(false);
        setActiveInput(null);
      }
    };

    const updateButtonPosition = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      const buttonSize = 40; // Adjust this if your button size is different
      const inputStyles = window.getComputedStyle(target);
      const borderWidth = parseFloat(inputStyles.borderRightWidth) || 0;
      const borderHeight = parseFloat(inputStyles.borderBottomWidth) || 0;
      const paddingRight = parseFloat(inputStyles.paddingRight) || 0;
      const paddingBottom = parseFloat(inputStyles.paddingBottom) || 0;

      setButtonPosition({
        top: rect.top + window.scrollY + rect.height - buttonSize - paddingBottom - borderHeight + 5, // Adjust the '+ 5' for vertical offset
        left: rect.left + window.scrollX + rect.width - buttonSize - paddingRight - borderWidth + 5, // Adjust the '+ 5' for horizontal offset
      });
    };

    const handleScrollOrResize = () => {
      if (activeInput) {
        updateButtonPosition(activeInput);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('scroll', handleScrollOrResize);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeInput]);

  const summarizeDOM = () => {
    const inputs = document.querySelectorAll('input, textarea');
    const fields = Array.from(inputs).map((input: HTMLInputElement | HTMLTextAreaElement) => ({
      id: input.id,
      name: input.name,
      type: input.type,
      value: input.value,
      placeholder: input.placeholder,
    }));
    return fields;
  };

  const getAutofillData = () => {
    setIsLoading(true);
    setIconColor('yellow');
    const fields = summarizeDOM();
    console.log('fields', fields);
    chrome.runtime.sendMessage(
      {
        action: 'getAutofillData',
        user_id: user_id,
        fields: fields,
      },
      response => {
        setIsLoading(false);
        console.log('response', response);
        if (response.status === 'success') {
          console.log('Autofill data received:', response.data);
          setIconColor('green');
        } else {
          console.error('Error getting autofill data:', response.message);
          setIconColor('red');
        }
      },
    );
  };

  const getAutofillDataForActiveInput = () => {
    if (activeInput) {
      setIsActiveInputLoading(true);
      setActiveInputIconColor('yellow');
      const field = {
        id: activeInput.id,
        name: activeInput.getAttribute('name'),
        type: (activeInput as HTMLInputElement).type || '',
        value: (activeInput as HTMLInputElement).value,
        placeholder: (activeInput as HTMLInputElement).placeholder,
      };
      console.log('field', field);
      chrome.runtime.sendMessage(
        {
          action: 'getAutofillData',
          user_id: user_id,
          fields: [field], // Send as array with one element
        },
        response => {
          setIsActiveInputLoading(false);
          console.log('response', response);
          if (response.status === 'success') {
            console.log('Autofill data received:', response.data);
            setActiveInputIconColor('green');
          } else {
            console.error('Error getting autofill data:', response.message);
            setActiveInputIconColor('red');
          }
        },
      );
    }
  };

  const handleIconClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isLoading) {
      getAutofillData();
    }
  };

  const handleActiveInputButtonClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isActiveInputLoading) {
      getAutofillDataForActiveInput();
    }
  };

  return (
    <>
      {/* Left-side Button */}
      <div className="fixed left-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          theme={theme}
          onClick={handleIconClick}
          className={`w-10 h-10 rounded-full shadow-lg transition-colors duration-200 ${
            iconColor === 'blue'
              ? 'bg-blue-500 hover:bg-blue-600'
              : iconColor === 'yellow'
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : iconColor === 'green'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
          }`}>
          {isLoading ? <LoadingSpinner /> : <span className="text-white text-xl">A</span>}
        </Button>
      </div>

      {/* Active Input Button */}
      {isVisible && buttonPosition && (
        <div
          id="extension-root"
          className="absolute z-50"
          style={{
            position: 'absolute',
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            pointerEvents: 'auto',
          }}>
          <Button
            theme={theme}
            onClick={handleActiveInputButtonClick}
            onMouseDown={e => e.preventDefault()} // Prevent input from losing focus
            tabIndex={-1} // Prevent button from receiving focus
            className={`w-10 h-10 rounded-full shadow-lg transition-colors duration-200 ${
              activeInputIconColor === 'blue'
                ? 'bg-blue-500 hover:bg-blue-600'
                : activeInputIconColor === 'yellow'
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : activeInputIconColor === 'green'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
            }`}>
            {isActiveInputLoading ? <LoadingSpinner /> : <span className="text-white text-xl">A</span>}
          </Button>
          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 text-white"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            X
          </button>
        </div>
      )}
    </>
  );
}
