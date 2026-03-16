import { jest } from '@jest/globals';
import { sanitizeInput } from '../middleware/auth.js';

describe('sanitizeInput middleware', () => {
  it('preserves raw buffers and array structures while sanitizing strings', () => {
    const rawBody = Buffer.from('{"event":"checkout.session.completed"}');
    const req = {
      body: {
        rawBody,
        name: ' <Joao> ',
        tags: [' <agenda> ', ' ok '],
        nested: {
          safe: ' <valor> ',
          $where: 'malicious'
        }
      },
      query: {
        search: ' <busca> '
      }
    };
    const next = jest.fn();

    sanitizeInput(req, {}, next);

    expect(next).toHaveBeenCalled();
    expect(Buffer.isBuffer(req.body.rawBody)).toBe(true);
    expect(req.body.rawBody).toBe(rawBody);
    expect(req.body.name).toBe('Joao');
    expect(req.body.tags).toEqual(['agenda', 'ok']);
    expect(Array.isArray(req.body.tags)).toBe(true);
    expect(req.body.nested).toEqual({ safe: 'valor' });
    expect(req.query.search).toBe('busca');
  });
});
