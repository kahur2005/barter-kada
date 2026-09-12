import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom has no layout/scroll implementation; real restoration is covered by E2E.
window.scrollTo = vi.fn();
HTMLDialogElement.prototype.showModal ??= function showModal() { this.open = true; };
HTMLDialogElement.prototype.close ??= function close() { this.open = false; };

// React Query settles asynchronously. Keep assertions resilient on constrained
// CI hosts while retaining Vitest's stricter per-test timeout.
configure({ asyncUtilTimeout: 3_000 });

afterEach(cleanup);
