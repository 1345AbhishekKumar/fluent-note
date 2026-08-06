import { describe, it, expect } from 'vitest';
import { setEdBodyHtml } from '../utils';

describe('setEdBodyHtml media preservation', () => {
  it('preserves existing video DOM element and playback position during re-render', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="block-wrapper" data-id="b_video">
        <video class="block-media-video" src="video.mp4" controls></video>
      </div>
      <div class="block-wrapper" data-id="b_todo">
        <div class="block-text-field">Task 1</div>
      </div>
    `;

    const videoEl = container.querySelector('video') as HTMLVideoElement;
    videoEl.play = () => Promise.resolve();
    Object.defineProperty(videoEl, 'currentTime', { value: 12.5, writable: true });
    Object.defineProperty(videoEl, 'paused', { value: false, writable: true });

    // Re-render with new to-do block added
    const newHtml = `
      <div class="block-wrapper" data-id="b_video">
        <video class="block-media-video" src="video.mp4" controls></video>
      </div>
      <div class="block-wrapper" data-id="b_todo">
        <div class="block-text-field">Task 1</div>
      </div>
      <div class="block-wrapper" data-id="b_todo2">
        <div class="block-text-field">Task 2</div>
      </div>
    `;

    setEdBodyHtml(container, newHtml);

    const updatedVideoEl = container.querySelector('video') as HTMLVideoElement;
    expect(updatedVideoEl).toBe(videoEl); // Same DOM node preserved!
    expect(container.querySelectorAll('.block-wrapper')).toHaveLength(3);
  });
});
