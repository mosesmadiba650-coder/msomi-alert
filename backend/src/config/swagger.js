const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MSOMI ALERT Backend API',
      version: '1.0.0',
      description: 'Broadcast course alerts to students with push notifications and Telegram integration',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Device: {
          type: 'object',
          properties: {
            deviceToken: { type: 'string', description: 'FCM device token' },
            phoneNumber: { type: 'string', description: 'Student phone number' },
            studentName: { type: 'string', description: 'Student full name' },
            courses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of course codes'
            }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            courseCode: { type: 'string', description: 'Course code (e.g., CSC201)' },
            title: { type: 'string', description: 'Notification title' },
            body: { type: 'string', description: 'Notification message' },
            urgency: {
              type: 'string',
              enum: ['normal', 'urgent'],
              description: 'Message urgency level'
            }
          },
          required: ['courseCode', 'title', 'body']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', description: 'Error message' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 */
const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(swaggerSpec, { explorer: true }));
  
  // Also provide raw JSON spec
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = { setupSwagger, swaggerSpec };
