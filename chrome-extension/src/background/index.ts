import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

let user_id: string | null = null;
exampleThemeStorage.getUserId().then(id => {
  user_id = id;
});

console.log('Background script loaded');

console.log('background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

const BACKEND_URL = 'http://localhost:8080';
// const BACKEND_URL = 'https://backend-prod-jbzvblgmza-ts.a.run.app'
const FRONTEND_URL = 'http://localhost:3000';
// const FRONTEND_URL = 'https://easyapply.ai';

const MAX_CHECK_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 1000; // 1 second

function checkForEasyApplyId(tabId: number) {
  return new Promise<string>((resolve, reject) => {
    let elapsedTime = 0;

    // Add a small delay before starting to check
    setTimeout(() => {
      const checkInterval = setInterval(() => {
        chrome.tabs.sendMessage(tabId, { action: 'checkForEasyApplyId' }, response => {
          if (chrome.runtime.lastError) {
            console.log('Background: Error sending message:', chrome.runtime.lastError);
            // Don't return here, continue checking
          }

          if (response && response.easyApplyId) {
            clearInterval(checkInterval);
            resolve(response.easyApplyId);
          }

          elapsedTime += CHECK_INTERVAL;
          if (elapsedTime >= MAX_CHECK_TIME) {
            clearInterval(checkInterval);
            reject('Timeout: Easy Apply ID not found');
          }
        });
      }, CHECK_INTERVAL);
    }, 1000); // 1 second delay
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Message received:', message);

  if (message.action === 'startAuthentication') {
    console.log('Background: Starting authentication process');
    chrome.tabs.create({ url: `${FRONTEND_URL}/app/profile` }, tab => {
      console.log('Background: New tab created:', tab.id);

      if (tab.id) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            console.log('Background: Tab loaded, starting to check for Easy Apply ID');
            chrome.tabs.onUpdated.removeListener(listener);

            checkForEasyApplyId(tab.id)
              .then(easyApplyId => {
                console.log('Background: Easy Apply ID found:', easyApplyId);
                chrome.storage.local.set({ easyApplyId }, () => {
                  console.log('Background: Easy Apply ID stored, sending authenticationComplete message');
                  chrome.runtime.sendMessage({ action: 'authenticationComplete', easyApplyId });
                });
              })
              .catch(error => {
                console.log('Background: Error finding Easy Apply ID:', error);
                chrome.runtime.sendMessage({ action: 'authenticationFailed', error });
              });
          }
        });
      }
    });
  } else if (message.action === 'getAutofillData') {
    console.log('Background: Getting autofill data');

    fetch(`${BACKEND_URL}/autofil`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: message.mode,
        user_id: message.user_id,
        fields: message.fields,
      }),
    })
      .then(response => {
        if (!response.body) {
          console.error('Background: No response body');
          sendResponse({ status: 'error', message: 'No response body' });
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function processStream() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              console.log('Stream complete');
              sendResponse({ status: 'success', message: 'Stream complete' });
              return;
            }

            const chunk = decoder.decode(value);
            buffer += chunk;

            // Process complete actions
            const actionRegex = /<action>\s*type\(\s*(\{[^}]+\}),\s*"([^"]+)"\s*\)\s*<\/action>/g;
            let match;
            while ((match = actionRegex.exec(buffer)) !== null) {
              const [fullMatch, selectorString, value] = match;
              const selector = JSON.parse(selectorString);
              const action = {
                selector: selector,
                value: value,
              };

              console.log('Sending action to content-runtime:', action);

              // Send message to content-runtime script
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'performAutofill',
                data: action,
              });

              // Remove the processed action from the buffer
              buffer = buffer.replace(fullMatch, '');
            }

            return processStream();
          });
        }

        processStream().catch(error => {
          console.error('Background: Error processing stream:', error);
          sendResponse({ status: 'error', message: error.message });
        });
      })
      .catch(error => {
        console.error('Background: Error fetching autofill data:', error);
        sendResponse({ status: 'error', message: error.message });
      });

    return true;
  }
});
