'use server';

// File-level 'use server': every export below is a Server Function. This is
// the only way a Client Component can invoke one — see FileLevelButton.tsx,
// which imports incrementFileLevelCounter directly.

import { incrementFileLevel } from './store';

export async function incrementFileLevelCounter() {
  return incrementFileLevel();
}
