import { bootstrapBackgroundApp } from './application/background-bootstrap';

export async function bootstrapBackground(): Promise<void> {
  await bootstrapBackgroundApp();
}
