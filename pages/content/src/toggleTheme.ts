import { myStorage } from '@extension/storage';

export async function toggleTheme() {
  console.log('initial theme:', await myStorage.get());
  // await myStorage.toggle();
  console.log('toggled theme:', await myStorage.get());
}
