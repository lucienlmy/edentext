import { describe, expect, it } from 'vitest';
import {
  codeForTag,
  findLanguage,
  languageFromOdf,
  odfFromLanguage,
  tagForLanguage,
} from '../../src/lib/storage/documentLanguage';

describe('French document language', () => {
  it('maps the dictionary code to the fr-FR document locale', () => {
    expect(findLanguage('fr')).toMatchObject({ code: 'fr', odf: { language: 'fr', country: 'FR' } });
    expect(odfFromLanguage('fr')).toEqual({ language: 'fr', country: 'FR' });
    expect(tagForLanguage('fr')).toBe('fr-FR');
  });

  it('maps French locale forms back to the dictionary code', () => {
    expect(codeForTag('fr-FR')).toBe('fr');
    expect(codeForTag('fr-CA')).toBe('fr');
    expect(languageFromOdf('fr', 'FR')).toBe('fr');
  });
});
