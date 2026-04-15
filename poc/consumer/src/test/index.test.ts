import { describe, it, expect } from 'vitest';
import { consumeString } from '../index';

describe('Consumer', () => {
  it('should consume the string from the provider', () => {
    const result = consumeString();
    expect(result).toBe('Hello from provider and consumer');
  });
});
