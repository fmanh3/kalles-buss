import { provideMagicString } from '@poc/provider';

export const consumeString = () => {
  const providerString = provideMagicString();
  return `${providerString} and consumer`;
};
