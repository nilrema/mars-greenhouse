import { describe, expect, it } from 'vitest';
import { resolveDataApiConfig } from './telemetryApi';

describe('telemetryApi', () => {
  it('treats missing Amplify outputs as an empty runtime config', () => {
    expect(resolveDataApiConfig({})).toEqual({});
  });
});
