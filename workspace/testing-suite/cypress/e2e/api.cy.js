describe('API E2E Tests', () => {
  beforeEach(() => {
    // Visitar la página base antes de cada test
    cy.visit('/');
  });

  it('should load the homepage', () => {
    cy.request('GET', '/').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('message', 'API de Testing funcionando correctamente');
    });
  });

  it('should get health status', () => {
    cy.request('GET', '/health').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('status', 'OK');
      expect(response.body).to.have.property('timestamp');
    });
  });

  it('should get users list', () => {
    cy.request('GET', '/users').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an('array');
      expect(response.body).to.have.length(2);
      expect(response.body[0]).to.have.all.keys('id', 'name', 'email');
    });
  });

  it('should create a new user', () => {
    const newUser = {
      name: 'Ana Martínez',
      email: 'ana@example.com'
    };

    cy.request('POST', '/users', newUser).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property('id');
      expect(response.body.name).to.eq(newUser.name);
      expect(response.body.email).to.eq(newUser.email);
    });
  });

  it('should return error for invalid user creation', () => {
    cy.request({
      method: 'POST',
      url: '/users',
      body: { name: 'Test User' }, // Missing email
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body).to.have.property('error', 'Name and email are required');
    });
  });
});