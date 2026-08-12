import { describe, it, expect } from 'vitest';
import { getGraphemeClusterDeletionBounds } from '../utils/stringHelpers';

describe('getGraphemeClusterDeletionBounds', () => {
  it('handles standard ASCII text backward deletion', () => {
    const text = 'Hello';
    const bounds = getGraphemeClusterDeletionBounds(text, 5, 'backward');
    expect(bounds).toEqual({ start: 4, end: 5 });
  });

  it('handles standard ASCII text forward deletion', () => {
    const text = 'Hello';
    const bounds = getGraphemeClusterDeletionBounds(text, 0, 'forward');
    expect(bounds).toEqual({ start: 0, end: 1 });
  });

  it('calculates full grapheme bounds for complex emojis (family emoji)', () => {
    const familyEmoji = '👨‍👩‍👧‍👦';
    const text = `Hi ${familyEmoji}`;
    // Caret at end of string
    const caret = text.length;
    const bounds = getGraphemeClusterDeletionBounds(text, caret, 'backward');
    expect(bounds.end).toBe(caret);
    expect(bounds.start).toBe(3); // Start index of the emoji
    expect(bounds.end - bounds.start).toBeGreaterThan(1);
  });

  it('calculates full grapheme bounds for skin-tone emojis', () => {
    const thumbsUp = '👍🏽';
    const text = `Good ${thumbsUp}`;
    const caret = text.length;
    const bounds = getGraphemeClusterDeletionBounds(text, caret, 'backward');
    expect(bounds.end).toBe(caret);
    expect(bounds.start).toBe(5);
  });

  it('calculates full grapheme bounds for combined diacritics', () => {
    const eAccent = 'e\u0301'; // 'é' normalized as NFD
    const text = `Caf${eAccent}`;
    const caret = text.length;
    const bounds = getGraphemeClusterDeletionBounds(text, caret, 'backward');
    expect(bounds.end).toBe(caret);
    expect(bounds.start).toBe(3); // Starts before 'e'
  });

  it('handles bounds at start of string', () => {
    const bounds = getGraphemeClusterDeletionBounds('Test', 0, 'backward');
    expect(bounds).toEqual({ start: 0, end: 0 });
  });

  it('handles bounds at end of string for forward delete', () => {
    const text = 'Test';
    const bounds = getGraphemeClusterDeletionBounds(text, text.length, 'forward');
    expect(bounds).toEqual({ start: text.length, end: text.length });
  });
});
