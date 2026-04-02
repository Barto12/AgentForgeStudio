class Validator {
  static isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isPhoneNumber(phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }

  static isStrongPassword(password) {
    // Al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  static isEmpty(value) {
    return value === null || value === undefined || value === '';
  }

  static isNumeric(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }
}

module.exports = Validator;