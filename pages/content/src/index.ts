import { toggleTheme } from '@src/toggleTheme';

console.log('content script loaded');

void toggleTheme();

// // Send a message to the background script to inject the runtime content script
// chrome.runtime.sendMessage({ action: 'injectRuntimeScript' });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'performAutofill') {
    const { selector, value } = message.data;
    console.log('Content-runtime: Performing autofill', { selector, value });

    const element = findElement(selector);
    if (element) {
      fillElement(element, value);
    } else {
      console.warn(`No element found for selector:`, selector);
    }
  } else if (message.action === 'checkForEasyApplyId') {
    console.log('Content: Checking for Easy Apply ID');
    const easyApplyIdElement = document.querySelector('input[easy-apply-id]');
    if (easyApplyIdElement) {
      const easyApplyId = easyApplyIdElement.getAttribute('easy-apply-id');
      console.log('Content: Easy Apply ID found:', easyApplyId);
      sendResponse({ easyApplyId });
    } else {
      console.log('Content: Easy Apply ID not found');
      sendResponse({ easyApplyId: null });
    }
    return true; // Indicates that the response will be sent asynchronously
  }
});

function findElement(selector: Record<string, string>): HTMLElement | null {
  for (const [key, value] of Object.entries(selector)) {
    let element: HTMLElement | null = null;

    switch (key) {
      case 'id':
        element = document.getElementById(value);
        break;
      case 'name':
        const elementsByName = document.getElementsByName(value);
        if (elementsByName.length > 0) {
          element = elementsByName[0] as HTMLElement;
        }
        break;
      case 'label':
        const labels = Array.from(document.getElementsByTagName('label'));
        const matchingLabel = labels.find(label => label.textContent?.trim().toLowerCase() === value.toLowerCase());
        if (matchingLabel && matchingLabel.htmlFor) {
          element = document.getElementById(matchingLabel.htmlFor);
        }
        break;
      // Add more cases for other selector types if needed
    }

    if (element) {
      console.log(`Element found by ${key}: ${value}`);
      return element;
    }
  }

  console.warn(`No element found for selector:`, selector);
  return null;
}

function fillElement(element: HTMLElement, value: string) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Replace \n\n with actual newlines
    const formattedValue = value.replace(/\\n/g, '\n');
    element.value = formattedValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element instanceof HTMLSelectElement) {
    const option = Array.from(element.options).find(opt => opt.text.toLowerCase() === value.toLowerCase());
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.warn(`No matching option found for value "${value}" in select element`);
    }
  } else {
    console.warn(`Unsupported element type for autofill: ${element.tagName}`);
  }
}

console.log('Content script loaded');
