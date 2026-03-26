import { defineBackground } from 'wxt/utils/define-background';
import { bootstrapBackground } from '../src/background/main';

export default defineBackground(async () => {
  await bootstrapBackground();
});
