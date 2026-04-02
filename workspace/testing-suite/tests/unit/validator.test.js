const Validator = require('../../src/utils/validator');

describe('Validator', () => {
  describe('isEmail', () => {
    test('should validate correct email formats', () => {
      expect(Validator.isEmail('test@example.com')).toBe(true);
      expect(Validator.isEmail('user.name@domain.co.uk')).toBe(true);
      expect(Validator.isEmail('user+tag@example.org')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(Validator.isEmail('invalid-email')).toBe(false);
      expect(Validator.isEmail('@example.com')).toBe(false);
      expect(Validator.isEmail('test@')).toBe(false);
      expect(Validator.isEmail('test..test@example.com')).toBe(false);
    });
  });

  describe('isPhoneNumber', () => {
    test('should validate correct phone numbers', () => {
      expect(Validator.isPhoneNumber('+1234567890')).toBe(true);
      expect(Validator.isPhoneNumber('1234567890')).toBe(true);
      expect(Validator.isPhoneNumber('+34 123 456 789')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(Validator.isPhoneNumber('123')).toBe(false);
      expect(Validator.isPhoneNumber('abc123')).toBe(false);
      expect(Validator.isPhoneNumber('+0123456789')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    test('should validate strong passwords', () => {
      expect(Validator.isStrongPassword('MyPass123!')).toBe(true);
      expect(Validator.isStrongPassword('Str0ng@Pass')).toBe(true);
    });

    test('should reject weak passwords', () => {
      expect(Validator.isStrongPassword('weak')).toBe(false);
      expect(Validator.isStrongPassword('12345678')).toBe(false);
      expect(Validator.isStrongPassword('NoNumbers!')).toBe(false);
      expect(Validator.isStrongPassword('nouppercas3!')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    test('should detect empty values', () => {
      expect(Validator.isEmpty('')).toBe(true);
      expect(Validator.isEmpty(null)).toBe(true);
      expect(Validator.isEmpty(undefined)).toBe(true);
    });

    test('should detect non-empty values', () => {
      expect(Validator.isEmpty('text')).toBe(false);
      expect(Validator.isEmpty(0)).toBe(false);
      expect(Validator.isEmpty(false)).toBe(false);
    });
  });

  describe('isNumeric', () => {
    test('should validate numeric values', () => {
      expect(Validator.isNumeric('123')).toBe(true);
      expect(Validator.isNumeric(123)).toBe(true);
      expect(Validator.isNumeric('123.45')).toBe(true);
      expect(Validator.isNumeric(-123)).toBe(true);
    });

    test('should reject non-numeric values', () => {
      expect(Validator.isNumeric('abc')).toBe(false);
      expect(Validator.isNumeric('123abc')).toBe(false);
      expect(Validator.isNumeric('')).toBe(false);
    });
  });
});