import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/utils/logger';

describe('logger', () => {
  it('routes info, warn, and error with structured context', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.info('Boot');
    logger.warn('Aviso', { code: 404 });
    logger.error('Falha', new Error('Network down'));

    expect(infoSpy).toHaveBeenCalledWith('[PrecoBrasil] Boot');
    expect(warnSpy).toHaveBeenCalledWith('[PrecoBrasil] Aviso | {"code":404}');
    expect(errorSpy).toHaveBeenCalledWith('[PrecoBrasil] Falha | Network down');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    logger.warn('Circular', circular);
    expect(warnSpy).toHaveBeenCalledWith('[PrecoBrasil] Circular | [unserializable context]');

    vi.restoreAllMocks();
  });
});
