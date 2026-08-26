import { describe, it, expect, vi } from 'vitest';
import { showToast, toast } from '../app/toaster';

vi.mock('sonner', () => {
  const toastFn: any = vi.fn((msg: any, opts: any) => 'toast-id-123');
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  toastFn.warning = vi.fn();
  toastFn.info = vi.fn();
  toastFn.loading = vi.fn();
  toastFn.promise = vi.fn();
  toastFn.dismiss = vi.fn();
  toastFn.custom = vi.fn();

  return {
    toast: toastFn,
    Toaster: () => null,
  };
});

describe('Sonner Toaster Integration', () => {
  it('handles standard message toasts', () => {
    showToast('Hello Fluent Notes');
    expect(toast).toHaveBeenCalledWith('Hello Fluent Notes');
  });

  it('translates action button callbacks into sonner action object', () => {
    const actionMock = vi.fn();
    showToast('Note deleted', 'Undo', actionMock);

    expect(toast).toHaveBeenCalledWith('Note deleted', expect.objectContaining({
      action: expect.objectContaining({
        label: 'Undo',
        onClick: expect.any(Function),
      }),
    }));

    // Trigger action callback
    const calls = (toast as any).mock.calls;
    const lastCall = calls[calls.length - 1];
    lastCall[1].action.onClick();
    expect(actionMock).toHaveBeenCalledTimes(1);
  });

  it('exposes direct semantic methods (success, error, loading, promise)', () => {
    showToast.success('Success message');
    expect(toast.success).toHaveBeenCalledWith('Success message');

    showToast.error('Error message');
    expect(toast.error).toHaveBeenCalledWith('Error message');

    showToast.loading('Loading sync...');
    expect(toast.loading).toHaveBeenCalledWith('Loading sync...');

    const dummyPromise = Promise.resolve('ok');
    showToast.promise(dummyPromise, { loading: 'Saving', success: 'Saved', error: 'Failed' });
    expect(toast.promise).toHaveBeenCalledWith(dummyPromise, { loading: 'Saving', success: 'Saved', error: 'Failed' });
  });
});
