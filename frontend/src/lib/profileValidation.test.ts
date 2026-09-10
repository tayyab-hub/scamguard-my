import { describe, expect, it } from 'vitest'
import {
  validateEmail,
  validateFullName,
  validateNewPassword,
  validateUsername,
} from './profileValidation'

describe('profile validation', () => {
  it.each([
    ['', false],
    [' ', false],
    ['Li', true],
    ['محمد علي', true],
    ["Anne-Marie O'Neill", true],
    ['Jean‑Luc O’Neill', true],
    ['Name\nInjected', false],
    ['<b>Name</b>', false],
    ['x'.repeat(101), false],
  ])('validates full name %j', (value, valid) => {
    expect(validateFullName(value) === null).toBe(valid)
  })

  it.each([
    ['', false],
    ['ab', false],
    ['abc', true],
    ['normal_user2', true],
    [' user', false],
    ['has space', false],
    ['user-name', false],
    ['<script>', false],
    ["user' OR 1=1", false],
    ['tayyáb', false],
    ['x'.repeat(31), false],
  ])('validates username %j', (value, valid) => {
    expect(validateUsername(value) === null).toBe(valid)
  })

  it('validates email and passphrase boundaries honestly', () => {
    expect(validateEmail('person@example.com')).toBeNull()
    expect(validateEmail('not-an-email')).not.toBeNull()
    expect(validateEmail(' ')).not.toBeNull()
    expect(validateNewPassword('correct horse battery staple')).toBeNull()
    expect(validateNewPassword('too short')).not.toBeNull()
    expect(validateNewPassword(' '.repeat(12))).not.toBeNull()
  })
})
