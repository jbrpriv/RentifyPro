const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RentifyPro API',
      version: '1.0.0',
      description: 'Industry-grade Rental Agreement Platform API',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '64a1b2c3d4e5f6789' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', enum: ['landlord', 'tenant', 'admin', 'property_manager'] },
            phoneNumber: { type: 'string', example: '03001234567' },
            isVerified: { type: 'boolean', example: false },
          },
        },
        Property: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', example: 'Sunset Apartments Unit 4B' },
            type: { type: 'string', enum: ['apartment', 'house', 'commercial', 'studio'] },
            status: { type: 'string', enum: ['vacant', 'occupied', 'maintenance'] },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', example: 'Street 1' },
                city: { type: 'string', example: 'Mardan' },
                state: { type: 'string', example: 'KPK' },
                zip: { type: 'string', example: '23200' },
                country: { type: 'string', example: 'Pakistan' },
              },
            },
            financials: {
              type: 'object',
              properties: {
                monthlyRent: { type: 'number', example: 50000 },
                securityDeposit: { type: 'number', example: 100000 },
                maintenanceFee: { type: 'number', example: 0 },
              },
            },
          },
        },
        Agreement: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'signed', 'active', 'expired', 'terminated'],
            },
            term: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
              },
            },
            financials: {
              type: 'object',
              properties: {
                rentAmount: { type: 'number', example: 50000 },
                depositAmount: { type: 'number', example: 100000 },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Not authorized' },
          },
        },
      },
    },
  },
  // Scan these files for JSDoc comments
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;