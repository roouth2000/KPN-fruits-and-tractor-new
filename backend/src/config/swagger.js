/**
 * OpenAPI 3.0 / Swagger Documentation Specification for Finovore
 * Fruit Wholesale / Retail Business Management System
 */

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Finovore Produce Mandi ERP - API Documentation',
    version: '1.0.0',
    description: `
**Finovore Wholesale & Retail Business Management System API**

Core capabilities include:
- POS & Common Billing Desk (Cash, Credit, Partial, Due Settlement, Trays)
- 11 Mandi Financial & Operations Reports (Daily/Monthly Sales, Profit, Loss, Damage, Returns, Customer/Supplier Dues, Trays)
- Fruit Inventory, Inward Consignments & Spoilage Audits
- Customer & Supplier Ledgers with atomic balance updates
- Role-Based Access Control (Superadmin, Admin, Cashier, Salesperson)

*Note: In production environments, access to this documentation endpoint is automatically disabled via \`ENABLE_SWAGGER\` and \`NODE_ENV\` environment variables.*
    `,
    contact: {
      name: 'Finovore Engineering',
      email: 'tech@finovore.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
    {
      url: '/api',
      description: 'Relative API Route (Current Host)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT bearer token obtained from /auth/login',
      },
      roleSimulationHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-role',
        description: 'Role simulation override (e.g. SUPERADMIN, ADMIN, CASHIER, SALESPERSON)',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      InvoiceItemInput: {
        type: 'object',
        required: ['productId', 'quantity', 'rate', 'unit'],
        properties: {
          productId: { type: 'integer', example: 1 },
          quantity: { type: 'number', example: 10 },
          unit: { type: 'string', example: 'BOX' },
          rate: { type: 'number', example: 2000 },
          discount: { type: 'number', example: 0 },
          taxPercent: { type: 'number', example: 0 },
          traysIssued: { type: 'integer', example: 10 },
          batchNumber: { type: 'string', example: 'BATCH-2026-001' },
        },
      },
      PaymentInput: {
        type: 'object',
        properties: {
          amount: { type: 'number', example: 15000 },
          paymentMode: { type: 'string', enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'], example: 'CASH' },
          reference: { type: 'string', example: 'UPI-REF-99213' },
          notes: { type: 'string', example: 'Settlement at cash counter' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
      roleSimulationHeader: [],
    },
  ],
  tags: [
    { name: 'Dashboard', description: 'Real-time Mandi metrics, sales summaries, and receivables' },
    { name: 'Billing & Invoices', description: 'POS invoicing, payments, printouts, and cancellations' },
    { name: 'Reports', description: 'All 11 financial, audit, profit, loss, and crate tracking reports' },
    { name: 'Customers', description: 'Customer profiles, balance inquiries, and transaction ledgers' },
    { name: 'Suppliers', description: 'Grower cooperatives, inward consignments, and payables' },
    { name: 'Products & Inventory', description: 'Fruit lines, packaging units, and stock movements' },
    { name: 'Crates & Trays', description: 'Plastic crate circulation tracking and deposits' },
    { name: 'Authentication & Roles', description: 'User login, role matrix, and permission management' },
  ],
  paths: {
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: "Get today's sales and current asset summary",
        responses: {
          200: { description: "Today's sales, collections, purchases, and dues" },
        },
      },
    },
    '/dashboard/financial-metrics': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get financial health KPIs (revenue, gross profit, receivables, payables)',
        responses: {
          200: { description: 'Aggregated financial metrics' },
        },
      },
    },
    '/dashboard/fruit-health': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get cold room stock levels, low-stock warnings, and ripening chamber metrics',
        responses: {
          200: { description: 'Produce health and warehouse status' },
        },
      },
    },
    '/dashboard/top-performers': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get top selling fruit lines and VIP buyers',
        responses: {
          200: { description: 'Top performing products and clients' },
        },
      },
    },
    '/dashboard/pending-dues': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get list of overdue customer balances and pending supplier settlements',
        responses: {
          200: { description: 'Outstanding payables and receivables' },
        },
      },
    },
    '/sales/invoices': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'List all invoices with status, customer, and date filters',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SAVED', 'DRAFT', 'CANCELLED'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Paginated list of invoices' },
        },
      },
      post: {
        tags: ['Billing & Invoices'],
        summary: 'Create a new invoice / POS bill (Atomic transaction)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customerType', 'items'],
                properties: {
                  customerId: { type: 'integer', example: 1 },
                  customerType: { type: 'string', enum: ['EXISTING', 'CASH', 'NEW'], example: 'EXISTING' },
                  isDraft: { type: 'boolean', example: false },
                  items: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/InvoiceItemInput' },
                  },
                  payments: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PaymentInput' },
                  },
                  notes: { type: 'string', example: 'Delivered to Bay #12 truck' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Invoice created successfully with ledger and stock updated' },
        },
      },
    },
    '/sales/invoices/{id}': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Get invoice details by ID with line items and payments',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Invoice details' },
        },
      },
      put: {
        tags: ['Billing & Invoices'],
        summary: 'Edit an existing invoice (Admin only permission gate)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  notes: { type: 'string' },
                  discount: { type: 'number' },
                  paidAmount: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Invoice updated' },
        },
      },
    },
    '/sales/invoices/{id}/cancel': {
      post: {
        tags: ['Billing & Invoices'],
        summary: 'Cancel an invoice (Admin only - reverses customer ledger & stock atomically)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'Client cancelled delivery order' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Invoice cancelled and balances restored' },
        },
      },
    },
    '/sales/invoices/{id}/pdf': {
      get: {
        tags: ['Billing & Invoices'],
        summary: 'Download generated PDF invoice for thermal or A4 printing',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'PDF binary stream',
            content: { 'application/pdf': {} },
          },
        },
      },
    },
    '/sales/payments': {
      post: {
        tags: ['Billing & Invoices'],
        summary: 'Record standalone previous due collection from customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customerId', 'amount'],
                properties: {
                  customerId: { type: 'integer', example: 1 },
                  amount: { type: 'number', example: 20000 },
                  paymentMode: { type: 'string', example: 'CASH' },
                  reference: { type: 'string', example: 'REC-901' },
                  notes: { type: 'string', example: 'Previous due payment' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Payment recorded and customer ledger credited' },
        },
      },
    },
    '/reports/daily-sales': {
      get: {
        tags: ['Reports'],
        summary: '1. Daily Sales Report (Invoices, cash/credit split, and turnover)',
        responses: { 200: { description: 'Daily sales rows and KPIs' } },
      },
    },
    '/reports/monthly-sales': {
      get: {
        tags: ['Reports'],
        summary: '2. Monthly Sales Report (Trend breakdown and average ticket values)',
        responses: { 200: { description: 'Monthly sales rows and KPIs' } },
      },
    },
    '/reports/purchase': {
      get: {
        tags: ['Reports'],
        summary: '3. Inward Purchase Report (Orchard consignments and vendor POs)',
        responses: { 200: { description: 'Purchase rows and KPIs' } },
      },
    },
    '/reports/stock': {
      get: {
        tags: ['Reports'],
        summary: '4. Stock & Valuation Report (Live crate valuation at wholesale rate)',
        responses: { 200: { description: 'Stock inventory positions' } },
      },
    },
    '/reports/profit': {
      get: {
        tags: ['Reports'],
        summary: '5. Profit & Margin Report (Revenue vs Farm COGS by fruit variety)',
        responses: { 200: { description: 'Profit rows and margin KPIs' } },
      },
    },
    '/reports/loss': {
      get: {
        tags: ['Reports'],
        summary: '6. Loss & Spoilage Report (Wastage write-offs and transit damage)',
        responses: { 200: { description: 'Loss and spoilage entries' } },
      },
    },
    '/reports/damage': {
      get: {
        tags: ['Reports'],
        summary: '7. Fruit Damage Report (Physical dock grading inspections)',
        responses: { 200: { description: 'Damage audit entries' } },
      },
    },
    '/reports/returns': {
      get: {
        tags: ['Reports'],
        summary: '8. Sales Returns Report (Customer RMA and credit vouchers)',
        responses: { 200: { description: 'Customer return vouchers' } },
      },
    },
    '/reports/customer-due': {
      get: {
        tags: ['Reports'],
        summary: '9. Customer Due Report (Receivables, aging, credit limits)',
        responses: { 200: { description: 'Customer due ledger balances' } },
      },
    },
    '/reports/supplier-due': {
      get: {
        tags: ['Reports'],
        summary: '10. Supplier Due Report (Accounts payable to orchard growers)',
        responses: { 200: { description: 'Supplier payable balances' } },
      },
    },
    '/reports/tray': {
      get: {
        tags: ['Reports'],
        summary: '11. Crate & Tray Asset Tracking Report (Trays in field vs yard)',
        responses: { 200: { description: 'Plastic crate circulation ledger' } },
      },
    },
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'List all registered Mandi customers',
        responses: { 200: { description: 'Customer array' } },
      },
    },
    '/customers/search': {
      get: {
        tags: ['Customers'],
        summary: 'Search customers by query (name, mobile, code)',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Filtered customer list' } },
      },
    },
    '/customers/{id}/balance': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer current due, available credit limit, and tray balance',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Customer balance info' } },
      },
    },
    '/customers/{id}/ledger': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer ledger statement of debits, credits, and running balance',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Customer ledger records' } },
      },
    },
    '/products': {
      get: {
        tags: ['Products & Inventory'],
        summary: 'List all fruit catalog products with live stock and rates',
        responses: { 200: { description: 'Product list' } },
      },
    },
    '/products/search': {
      get: {
        tags: ['Products & Inventory'],
        summary: 'Search fruits by name, variety, or code',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Filtered fruit catalog' } },
      },
    },
    '/products/units': {
      get: {
        tags: ['Products & Inventory'],
        summary: 'Get standard packaging units (BOX, CRATE, KG, DOZEN)',
        responses: { 200: { description: 'Available units' } },
      },
    },
    '/products/tax-config': {
      get: {
        tags: ['Products & Inventory'],
        summary: 'Get APMC market cess and tax configuration',
        responses: { 200: { description: 'Tax configurations' } },
      },
    },
    '/suppliers': {
      get: {
        tags: ['Suppliers'],
        summary: 'List all registered growers and vendor cooperatives',
        responses: { 200: { description: 'Supplier list' } },
      },
      post: {
        tags: ['Suppliers'],
        summary: 'Register a new supplier or orchard grower',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: { type: 'string', example: 'Nashik Pomegranate Growers' },
                  phone: { type: 'string', example: '+91 98223 55112' },
                  city: { type: 'string', example: 'Nashik' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Supplier registered' } },
      },
    },
    '/suppliers/inward-purchase': {
      post: {
        tags: ['Suppliers'],
        summary: 'Record orchard consignment inward at arrival dock',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['supplierId', 'productId', 'quantity', 'rate'],
                properties: {
                  supplierId: { type: 'integer', example: 1 },
                  productId: { type: 'integer', example: 1 },
                  quantity: { type: 'number', example: 50 },
                  rate: { type: 'number', example: 1500 },
                  poNumber: { type: 'string', example: 'PO-1057' },
                  notes: { type: 'string', example: 'Reefer truck consignment' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Inward consignment logged into stock & supplier ledger' } },
      },
    },
    '/suppliers/{id}/pay': {
      post: {
        tags: ['Suppliers'],
        summary: 'Record payment disbursement to supplier',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', example: 50000 },
                  paymentMode: { type: 'string', example: 'RTGS' },
                  reference: { type: 'string', example: 'UTR-991283' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Disbursement logged' } },
      },
    },
    '/trays/summary': {
      get: {
        tags: ['Crates & Trays'],
        summary: 'Get plastic crate overview (yard stock, with buyers, with farmers)',
        responses: { 200: { description: 'Tray circulation statistics' } },
      },
    },
    '/trays/movement': {
      post: {
        tags: ['Crates & Trays'],
        summary: 'Record tray issuance or return',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'quantity'],
                properties: {
                  type: { type: 'string', enum: ['ISSUE', 'RETURN'] },
                  customerId: { type: 'integer' },
                  supplierId: { type: 'integer' },
                  quantity: { type: 'integer', example: 20 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Tray movement registered' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication & Roles'],
        summary: 'User login for JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'JWT token and user profile returned' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication & Roles'],
        summary: 'Get authenticated user profile and permissions',
        responses: { 200: { description: 'User profile with permissions array' } },
      },
    },
    '/roles': {
      get: {
        tags: ['Authentication & Roles'],
        summary: 'List all system roles and permissions',
        responses: { 200: { description: 'Roles and permissions' } },
      },
    },
    '/users': {
      get: {
        tags: ['Authentication & Roles'],
        summary: 'List all staff users',
        responses: { 200: { description: 'User list' } },
      },
    },
  },
};

module.exports = swaggerSpec;

