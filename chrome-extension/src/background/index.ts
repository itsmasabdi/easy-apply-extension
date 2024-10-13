import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
const BACKEND_URL = 'http://localhost:8080';

const systemPrompt = `You are an autofill assistant. \
Use the information bellow and return the action to autofill the fields.

CONTEXT:
\"\"\" \
An experienced machine learning engineer with a proven track record in developing and deploying advanced ML models. Expertise spans across building end-to-end machine learning pipelines, including data preprocessing, analysis, model development, tuning, and deployment. Proficient in Python with a solid understanding of TensorFlow, PyTorch, scikit-learn, and container technologies like Docker and Kubernetes. Familiar with leveraging both proprietary and third-party APIs to enhance model functionality. Committed to driving business growth through data-driven decision-making and rapid iteration of ML-driven features. Holds a strong foundation in computer science principles, emphasizing system design, data structures, and architecture. Capable of translating complex deep learning research into practical applications, delivering value to users. Adept at articulating technical concepts to diverse audiences, ensuring seamless integration of AI solutions into business processes.

Name: Mas Abdi
Email: masoudabdi13@gmail.com
Residency: Australia (Citizen)
GitHub: https://github.com/itsmasabdi
Phone: +61 481 393 533
LinkedIn: www.linkedin.com/in/masabdi
\"\"\" \

THE OUTPUT SHOULD BE IN THIS FORMAT:
<action> type(selector={"key": "value"}, "value") </action>

WHERE "key" and "value" are html attributes of the field.

EXAMPLE:
<action> type({ "id": "name" }, "Mas Abdi") </action>
<action> type({ "name": "email" }, "masabdi@gmail.com") </action>
<action> type({ "label": "Phone" }, "081234567890") </action>

MAKE SURE TO ANSWER ALL OF THE FIELDS PROVIDED INCLUDING COVER LETTER!
`;
exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectRuntimeScript' && sender.tab) {
    chrome.scripting
      .executeScript({
        target: { tabId: sender.tab.id },
        files: ['/content-runtime/index.iife.js'],
      })
      .then(() => {
        console.log('Runtime content script injected successfully');
      })
      .catch(err => {
        console.error('Failed to inject runtime content script:', err);
        if (err.message.includes('Cannot access a chrome:// URL')) {
          console.warn('Cannot inject script into chrome:// or about:// pages');
        }
      });
  } else if (message.action === 'getAutofillData') {
    console.log('Background: Getting autofill data');

    fetch(`${BACKEND_URL}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: message.mode,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content:
              'Here are the fields to be autfilled: ' +
              message.fields?.map((field: any) => JSON.stringify(field)).join(', ') +
              '\n MAKE SURE TO ANSWER ALL OF THE FIELDS PROVIDED!',
          },
        ],
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
