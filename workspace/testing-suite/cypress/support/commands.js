// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command for API testing
Cypress.Commands.add('apiRequest', (method, url, body = null) => {
  return cy.request({
    method,
    url,
    body,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});

// Custom command for creating test user
Cypress.Commands.add('createTestUser', (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com'
  };
  
  const user = { ...defaultUser, ...userData };
  
  return cy.apiRequest('POST', '/users', user);
});

// Custom command for waiting for API to be ready
Cypress.Commands.add('waitForAPI', () => {
  return cy.request({
    url: '/health',
    retryOnStatusCodeFailure: true,
    timeout: 10000
  });
});