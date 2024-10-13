import 'webextension-polyfill';
import { myStorage } from '@extension/storage';

const BACKEND_URL = 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';
const MAX_CHECK_TIME = 60000;
const CHECK_INTERVAL = 1000;

function checkForEasyApplyId(tabId: number) {
  return new Promise<string>((resolve, reject) => {
    let elapsedTime = 0;

    setTimeout(() => {
      const checkInterval = setInterval(() => {
        chrome.tabs.sendMessage(tabId, { action: 'checkForEasyApplyId' }, response => {
          if (chrome.runtime.lastError) {
            console.log('Background: Error sending message:', chrome.runtime.lastError);
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
    }, 1000);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startAuthentication') {
    chrome.tabs.create({ url: `${FRONTEND_URL}/app/profile` }, tab => {
      if (tab.id) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);

            checkForEasyApplyId(tab.id)
              .then(easyApplyId => {
                myStorage.setUserId(easyApplyId);
                chrome.runtime.sendMessage({ action: 'authenticationComplete', easyApplyId });
              })
              .catch(error => {
                chrome.runtime.sendMessage({ action: 'authenticationFailed', error });
              });
          }
        });
      }
    });
  } else if (message.action === 'getAutofillData') {
    console.log('lets make a call');

    console.log('message.document_ids', message.document_ids);

    fetch(`${BACKEND_URL}/autofill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: message.mode,
        user_id: message.userId,
        fields: message.fields,
        document_ids: message.document_ids,
      }),
    })
      .then(response => {
        if (!response.body) {
          sendResponse({ status: 'error', message: 'No response body' });
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        function processStream() {
          return reader.read().then(({ done, value }) => {
            if (done) {
              sendResponse({ status: 'success', message: 'Stream complete' });
              return;
            }

            const chunk = decoder.decode(value);
            buffer += chunk;

            const actionRegex = /<action>\s*type\(\s*(\{[^}]+\}),\s*"([^"]+)"\s*\)\s*<\/action>/g;
            let match;
            while ((match = actionRegex.exec(buffer)) !== null) {
              const [fullMatch, selectorString, value] = match;
              const selector = JSON.parse(selectorString);
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'performAutofill',
                data: { selector, value },
              });

              buffer = buffer.replace(fullMatch, '');
            }

            return processStream();
          });
        }

        processStream().catch((error: any) => {
          sendResponse({ status: 'error', message: error.message });
        });
      })
      .catch(error => {
        sendResponse({ status: 'error', message: error.message });
      });

    return true;
  }
});
