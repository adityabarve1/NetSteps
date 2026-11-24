import { describe, expect, it } from 'vitest';
import { glossary } from './index';
import { lookupTerm } from './lookup';
import { validateGlossary } from './validateGlossary';

describe('the real glossary', () => {
  it('has kebab-case ids and a term and definition for every entry', () => {
    expect(validateGlossary(glossary)).toEqual([]);
  });
});

describe('validateGlossary', () => {
  const entry = { term: 'packet', definition: 'A small piece of data.' };

  it('accepts good entries', () => {
    expect(
      validateGlossary({ packet: entry, 'subnet-mask': entry, ipv4: entry }),
    ).toEqual([]);
  });

  it('flags ids that are not kebab-case', () => {
    for (const id of [
      'Packet',
      'subnet_mask',
      'subnet mask',
      '-packet',
      'packet-',
      'a--b',
      '',
    ]) {
      expect(validateGlossary({ [id]: entry }), id).toEqual([
        expect.stringMatching(/not kebab-case/),
      ]);
    }
  });

  it('flags an empty term or definition', () => {
    expect(validateGlossary({ packet: { ...entry, term: ' ' } })).toEqual([
      expect.stringMatching(/"packet" needs a term/),
    ]);
    expect(validateGlossary({ packet: { ...entry, definition: '' } })).toEqual([
      expect.stringMatching(/"packet" needs a definition/),
    ]);
  });
});

describe('lookupTerm', () => {
  const glossaryOf = {
    packet: { term: 'packet', definition: 'A small piece of data.' },
  };

  it('finds a known term', () => {
    expect(lookupTerm(glossaryOf, 'packet')?.definition).toBe(
      'A small piece of data.',
    );
  });

  it('returns undefined for unknown ids, including object built-ins', () => {
    for (const id of ['nope', '', 'constructor', 'toString', '__proto__']) {
      expect(lookupTerm(glossaryOf, id), id).toBeUndefined();
    }
  });
});
