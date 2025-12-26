# Internal Operations Portal

A comprehensive Next.js application for managing internal company operations including employee management, asset tracking, policy hosting, document management, access control, and approval workflows with complete audit logging.

## Features

### 🏢 Core Modules

- **Employee Management**: Manage employee records, hierarchy, and organizational structure
- **Asset Management**: Track and manage company assets (laptops, desktops, equipment)
- **Access Management**: Handle access requests and permissions with approval workflows
- **Policy Management**: Create, version, and manage company policies
- **Document Hosting**: Host and manage company documentation with categorization
- **Approval Workflows**: Configurable approval processes for various operations
- **Audit Logging**: Complete audit trail for all system changes and activities

### 🔧 Technical Features

- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **API**: RESTful API routes with proper error handling
- **Authentication**: Ready for integration with your auth provider
- **Responsive Design**: Mobile-friendly interface
- **Type Safety**: Full TypeScript implementation

## Database Schema

### Core Entities

- **Employee**: User management with roles and hierarchy
- **Asset**: Physical and digital asset tracking
- **Resource**: General resource management
- **Access**: Access request and permission management
- **Policy**: Policy document management with versioning
- **Document**: General document hosting with categorization
- **ApprovalWorkflow**: Configurable approval processes
- **AuditLog**: Complete audit trail for all changes

### Key Relationships

- Employees can have managers and subordinates
- Assets can be assigned to employees
- Access requests link employees to resources
- Policies and documents have owners
- Approval workflows can be linked to policies, documents, or assets
- All changes are logged in audit trails

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and setup**:
   ```bash
   cd internal-portal
   npm install
   ```

2. **Database setup**:
   ```bash
   # Update your .env file with database connection
   DATABASE_URL="postgresql://username:password@localhost:5432/internal_portal"
   
   # Run migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
internal-portal/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── assets/        # Asset management APIs
│   │   ├── documents/     # Document management APIs
│   │   ├── workflows/     # Approval workflow APIs
│   │   └── ...
│   ├── assets/            # Asset management pages
│   ├── documents/         # Document management pages
│   ├── approvals/         # Approval workflow pages
│   └── ...
├── components/            # Reusable React components
│   ├── AssetForm.tsx
│   ├── DocumentForm.tsx
│   ├── ApprovalWorkflowForm.tsx
│   └── ...
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Prisma client
│   └── audit.ts          # Audit logging utilities
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
└── types/                # TypeScript type definitions
    └── index.ts
```

## API Endpoints

### Assets
- `GET /api/assets` - List all assets
- `POST /api/assets` - Create new asset

### Documents  
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create new document

### Approval Workflows
- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create new workflow
- `POST /api/workflows/[id]/approve` - Approve workflow
- `POST /api/workflows/[id]/reject` - Reject workflow

### Employees
- `GET /api/employee` - List all employees
- `POST /api/employee` - Create new employee

## Key Components

### AssetForm
Form component for creating and editing assets with fields for:
- Asset name, type, and serial number
- Owner assignment and status
- Location, purchase date, and warranty
- Value and description

### DocumentForm  
Form component for creating documents with:
- Title, category, and content
- Owner assignment and status
- Tags for categorization
- Markdown content support

### ApprovalWorkflowForm
Configurable workflow form supporting:
- Different workflow types (access, policy, document, asset requests)
- Requester selection and justification
- Related entity linking

### AuditLog
Complete audit trail system that logs:
- Entity type and ID
- Changed fields with old/new values
- User who made the change
- Timestamp of change

## Customization

### Adding New Workflow Types
1. Add new enum value to `WorkflowType` in `types/index.ts`
2. Update the form component to handle the new type
3. Add any specific logic in the API routes

### Adding New Asset Types
1. Add new enum value to `AssetType` in `types/index.ts`
2. Update the Prisma schema if needed
3. Run migration: `npx prisma migrate dev`

### Extending Audit Logging
The audit system automatically logs changes. To add new entity types:
1. Add to `EntityType` enum in schema
2. Update the `logAudit` function calls in your API routes

## Security Considerations

- **Authentication**: Integrate with your preferred auth provider
- **Authorization**: Implement role-based access control
- **Input Validation**: Add proper validation for all forms
- **API Security**: Add rate limiting and request validation
- **Audit Trail**: All changes are logged for compliance

## Deployment

### Environment Variables
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
```

### Production Build
```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.