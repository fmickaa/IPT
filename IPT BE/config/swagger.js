const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  // CRITICAL FIX: The nested components MUST live inside a top-level 'definition' block
  definition: {
    openapi: '3.0.0',
    info: { title: 'Leave Management API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Creates user',
          requestBody: {
            content: { 'application/json': { schema: { 
              type: 'object', 
              properties: { 
                username: {type: 'string'}, 
                password: {type: 'string'}, 
                fullName: {type: 'string'},
                email: {type: 'string'},
                department: {type: 'string'},
                role: {type: 'string', enum: ['Employee', 'Supervisor', 'Manager', 'Admin'], default: 'Employee'} 
              } 
            }}}
          },
          responses: { 201: { description: 'Created' } }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login user',
          requestBody: {
            content: { 'application/json': { schema: { 
              type: 'object', 
              properties: { username: {type: 'string'}, password: {type: 'string'} } 
            }}}
          },
          responses: { 200: { description: 'Success' } }
        }
      },
      '/api/leave-types': {
        get: { 
            tags: ['Leave Types'], 
            summary: 'Get all available leave types', 
            responses: { 200: { description: 'Success' } } 
        },
        post: {
          tags: ['Leave Types'],
          summary: 'Create a new leave type (Admin/Supervisor Only)',
          requestBody: {
            content: { 'application/json': { schema: { 
              type: 'object', 
              properties: { 
                type: { type: 'string', example: 'Sick Leave' }, 
                maxDaysPerYear: { type: 'number', example: 10 } 
              } 
            }}}
          },
          responses: { 201: { description: 'Created' } }
        }
      },
      '/api/leave': {
        post: {
          tags: ['Leaves'],
          summary: 'Submit leave request (Validates Balance)',
          requestBody: {
            content: { 'application/json': { schema: { 
              type: 'object', 
              properties: { 
                leaveTypeId: {type: 'string'}, 
                startDate: {type: 'string', format: 'date'}, 
                endDate: {type: 'string', format: 'date'}, 
                reason: {type: 'string'} 
              } 
            }}}
          },
          responses: { 201: { description: 'Created' }, 400: { description: 'Insufficient Balance' } }
        },
        get: { tags: ['Leaves'], summary: 'Get all leaves (Authorized roles)', responses: { 200: { description: 'Success' } } }
      },
      '/api/leave/{id}': {
        get: { tags: ['Leaves'], summary: 'Get specific leave', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } },
        put: { tags: ['Leaves'], summary: 'Edit leave', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { reason: {type: 'string'} } } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Leaves'], summary: 'Cancel Leave', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } }
      },
      '/api/leave/{id}/status': {
        patch: {
          tags: ['Leaves'],
          summary: 'Approve or Reject leave (Supervisor/Admin)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { 
              type: 'object', 
              properties: { status: { type: 'string', enum: ['Approved', 'Rejected'], example: 'Approved' } } 
            }}}
          },
          responses: { 200: { description: 'Status updated' } }
        }
      },
      '/api/admin/reports': {
        get: {
          tags: ['Admin Reports'],
          summary: 'Get leave usage summary for all employees',
          responses: { 200: { description: 'Success' } }
        }
      },
      '/api/users': { get: { tags: ['Users'], summary: 'Get all users', responses: { 200: { description: 'Success' } } } },
      '/api/users/{id}': { get: { tags: ['Users'], summary: 'Get specific user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Success' } } } }
    }
  },
  apis: [], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
module.exports = { swaggerUi, swaggerDocs };