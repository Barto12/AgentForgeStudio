class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    return a * b;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return a / b;
  }

  power(base, exponent) {
    return Math.pow(base, exponent);
  }

  sqrt(number) {
    if (number < 0) {
      throw new Error('Cannot calculate square root of negative number');
    }
    return Math.sqrt(number);
  }
}

module.exports = Calculator;