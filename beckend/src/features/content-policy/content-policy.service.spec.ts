import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPolicyService } from './content-policy.service';
import { getPublicJson } from '../../infra/r2';

// The read path is just two public-CDN reads (pointer → versioned blob); mock them.
vi.mock('../../infra/r2', () => ({ getPublicJson: vi.fn() }));
const mockGetPublicJson = vi.mocked(getPublicJson);

const EMPTY_EN = { locale: 'en', version: 0, blocklist: [] };

describe('ContentPolicyService', () => {
  let service: ContentPolicyService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined); // quiet soft-degrade logs
    service = new ContentPolicyService();
  });

  it('resolves latest.json then the versioned blob and returns the validated policy', async () => {
    mockGetPublicJson
      .mockResolvedValueOnce({ version: 3 }) // policy/en/latest.json
      .mockResolvedValueOnce({ locale: 'en', version: 3, blocklist: ['banned'] }); // policy/en/v3.json

    await expect(service.getPolicy('en')).resolves.toEqual({ locale: 'en', version: 3, blocklist: ['banned'] });
    expect(mockGetPublicJson).toHaveBeenNthCalledWith(1, 'policy/en/latest.json');
    expect(mockGetPublicJson).toHaveBeenNthCalledWith(2, 'policy/en/v3.json');
  });

  it('returns the empty (permissive) policy when the pointer is absent — no version fetch', async () => {
    mockGetPublicJson.mockResolvedValueOnce(null); // unconfigured base or 404

    await expect(service.getPolicy('en')).resolves.toEqual(EMPTY_EN);
    expect(mockGetPublicJson).toHaveBeenCalledTimes(1); // never reaches the versioned read
  });

  it('returns the empty policy when the pointer is malformed', async () => {
    mockGetPublicJson.mockResolvedValueOnce({ version: 0 }); // not a positive int

    await expect(service.getPolicy('es')).resolves.toEqual({ locale: 'es', version: 0, blocklist: [] });
    expect(mockGetPublicJson).toHaveBeenCalledTimes(1);
  });

  it('returns the empty policy when the versioned blob is missing or invalid', async () => {
    mockGetPublicJson.mockResolvedValueOnce({ version: 2 }).mockResolvedValueOnce(null);

    await expect(service.getPolicy('fr')).resolves.toEqual({ locale: 'fr', version: 0, blocklist: [] });
  });

  it("returns the empty policy when the blob's locale does not match the request", async () => {
    mockGetPublicJson
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ locale: 'de', version: 1, blocklist: ['x'] }); // wrong locale

    await expect(service.getPolicy('en')).resolves.toEqual(EMPTY_EN);
  });

  it('degrades to the empty policy when a fetch throws (offline-safe)', async () => {
    mockGetPublicJson.mockRejectedValueOnce(new Error('network down'));

    await expect(service.getPolicy('en')).resolves.toEqual(EMPTY_EN);
  });

  it('rejects a malformed locale tag with a VALIDATION error and never touches R2', async () => {
    await expect(service.getPolicy('x')).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(service.getPolicy('../secret')).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(mockGetPublicJson).not.toHaveBeenCalled();
  });

  it('caches within the TTL — a second lookup does not re-read R2', async () => {
    mockGetPublicJson
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ locale: 'en', version: 1, blocklist: [] });

    const first = await service.getPolicy('en');
    const second = await service.getPolicy('en');

    expect(second).toEqual(first);
    expect(mockGetPublicJson).toHaveBeenCalledTimes(2); // both reads were the first lookup's
  });
});
