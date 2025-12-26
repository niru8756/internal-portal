const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedCEOBootstrap() {
  console.log('🚀 CEO Bootstrap Seed Script');
  console.log('=====================================\n');

  try {
    // Check if any employees already exist
    const existingEmployees = await prisma.employee.count();
    
    if (existingEmployees > 0) {
      console.log(`⚠️  Warning: ${existingEmployees} employee(s) already exist in the database.`);
      console.log('This script is intended for initial bootstrap only.');
      console.log('Continuing anyway...\n');
    }

    console.log('Creating CEO with login credentials...\n');

    // CEO credentials - ready to login immediately
    const ceoEmail = 'nihil@company.com';
    const ceoPassword = 'CEO123456'; // Default password - should be changed after first login
    const hashedPassword = await bcrypt.hash(ceoPassword, 12);

    // Check if CEO already exists
    const existingCEO = await prisma.employee.findUnique({
      where: { email: ceoEmail }
    });

    let ceo;
    if (existingCEO) {
      console.log('✅ CEO already exists, updating credentials...');
      ceo = await prisma.employee.update({
        where: { email: ceoEmail },
        data: {
          password: hashedPassword,
          status: 'ACTIVE'
        }
      });
    } else {
      console.log('✅ Creating new CEO...');
      ceo = await prisma.employee.create({
        data: {
          name: 'Chief Executive Officer',
          email: ceoEmail,
          password: hashedPassword,
          role: 'CEO',
          department: 'Executive',
          status: 'ACTIVE', // Ready to login immediately
          joiningDate: new Date(),
          phone: '+1-555-0001'
        }
      });
    }

    console.log('✅ CEO created/updated successfully!');
    console.log(`   Name: ${ceo.name}`);
    console.log(`   Email: ${ceo.email}`);
    console.log(`   Role: ${ceo.role}`);
    console.log(`   Status: ${ceo.status}`);
    console.log(`   Password: ${ceoPassword} (change after first login)`);

    // Create some sample employees for the CEO to manage (INACTIVE - need signup)
    console.log('\n📋 Creating sample employees for CEO to manage...');

    const sampleEmployees = [
      {
        name: 'Sid',
        email: 'sarah.johnson@company.com',
        role: 'CTO',
        department: 'Technology',
        phone: '+1-555-0002'
      },
      {
        name: 'Siddhnat',
        email: 'michael.brown@company.com',
        role: 'ENGINEERING_MANAGER',
        department: 'Engineering',
        phone: '+1-555-0003'
      },
      {
        name: 'Vandan',
        email: 'jennifer.martinez@company.com',
        role: 'HR_MANAGER',
        department: 'Human Resources',
        phone: '+1-555-0004'
      },
      {
        name: 'Radhika',
        email: 'robert.taylor@company.com',
        role: 'FULLSTACK_DEVELOPER',
        department: 'Engineering',
        phone: '+1-555-0005'
      },
      {
        name: 'Muskan',
        email: 'emily.davis@company.com',
        role: 'MARKETING_MANAGER',
        department: 'Marketing',
        phone: '+1-555-0006'
      }
    ];

    const createdEmployees = [];
    for (const employeeData of sampleEmployees) {
      // Check if employee already exists
      const existing = await prisma.employee.findUnique({
        where: { email: employeeData.email }
      });

      if (existing) {
        console.log(`   ⚠️  ${employeeData.name} already exists, skipping...`);
        createdEmployees.push(existing);
      } else {
        const employee = await prisma.employee.create({
          data: {
            ...employeeData,
            status: 'INACTIVE', // They need to use signup to activate
            joiningDate: new Date(),
            password: null, // No password - they'll set it during signup
            managerId: ceo.id // CEO is their manager
          }
        });
        createdEmployees.push(employee);
        console.log(`   ✅ Created: ${employee.name} (${employee.role})`);
      }
    }

    // Create some sample resources for the system
    console.log('\n🔧 Creating sample resources...');

    const sampleResources = [
      {
        name: 'MacBook Pro 16"',
        type: 'PHYSICAL',
        category: 'Laptop',
        description: 'High-performance laptop for development work',
        status: 'ACTIVE',
        ownerId: ceo.id,
        permissionLevel: 'ADMIN'
      },
      {
        name: 'GitHub Enterprise',
        type: 'SOFTWARE',
        category: 'Development Tools',
        description: 'Source code management and collaboration platform',
        status: 'ACTIVE',
        ownerId: ceo.id,
        permissionLevel: 'ADMIN'
      },
      {
        name: 'AWS Production Environment',
        type: 'CLOUD',
        category: 'Infrastructure',
        description: 'Production cloud infrastructure access',
        status: 'ACTIVE',
        ownerId: ceo.id,
        permissionLevel: 'ADMIN'
      },
      {
        name: 'Slack Workspace',
        type: 'SOFTWARE',
        category: 'Communication',
        description: 'Team communication and collaboration tool',
        status: 'ACTIVE',
        ownerId: ceo.id,
        permissionLevel: 'ADMIN'
      },
      {
        name: 'Office Desk Setup',
        type: 'PHYSICAL',
        category: 'Furniture',
        description: 'Complete office desk with monitor and accessories',
        status: 'ACTIVE',
        ownerId: ceo.id,
        permissionLevel: 'READ'
      }
    ];

    const createdResources = [];
    for (const resourceData of sampleResources) {
      // Check if resource already exists
      const existing = await prisma.resource.findFirst({
        where: { name: resourceData.name }
      });

      if (existing) {
        console.log(`   ⚠️  ${resourceData.name} already exists, skipping...`);
        createdResources.push(existing);
      } else {
        const resource = await prisma.resource.create({
          data: resourceData
        });
        createdResources.push(resource);
        console.log(`   ✅ Created: ${resource.name} (${resource.type})`);
      }
    }

    // Create a sample policy
    console.log('\n📜 Creating sample policy...');

    const existingPolicy = await prisma.policy.findFirst({
      where: { title: 'Employee Handbook' }
    });

    if (!existingPolicy) {
      const samplePolicy = await prisma.policy.create({
        data: {
          title: 'Employee Handbook',
          category: 'HR',
          content: 'This is the company employee handbook with all policies and procedures.',
          status: 'PUBLISHED',
          ownerId: ceo.id,
          effectiveDate: new Date(),
          version: 1
        }
      });
      console.log(`   ✅ Created: ${samplePolicy.title}`);
    } else {
      console.log(`   ⚠️  Employee Handbook already exists, skipping...`);
    }

    console.log('\n🎉 Bootstrap Complete!');
    console.log('=====================================');

    console.log('\n🔑 CEO Login Credentials:');
    console.log(`Email: ${ceoEmail}`);
    console.log(`Password: ${ceoPassword}`);
    console.log('⚠️  IMPORTANT: Change this password after first login!');

    console.log('\n👥 Sample Employees Created (Need Signup):');
    createdEmployees.forEach(emp => {
      console.log(`• ${emp.name} (${emp.role}) - ${emp.email}`);
    });

    console.log('\n🔧 Sample Resources Created:');
    createdResources.forEach(res => {
      console.log(`• ${res.name} (${res.type})`);
    });

    console.log('\n📝 Next Steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Login as CEO: http://localhost:3000/login');
    console.log(`   Email: ${ceoEmail}`);
    console.log(`   Password: ${ceoPassword}`);
    console.log('3. Change CEO password in profile settings');
    console.log('4. Employees can signup using their email addresses');
    console.log('5. CEO can create more employees from the admin panel');

    console.log('\n🎯 What CEO Can Do:');
    console.log('• View and manage all employees');
    console.log('• Create new employees (who can then signup)');
    console.log('• Manage all resources and access requests');
    console.log('• Approve workflows and requests');
    console.log('• Create and manage policies');
    console.log('• View system-wide analytics and reports');

    console.log('\n📧 Employee Signup Process:');
    console.log('• Employees go to: http://localhost:3000/signup');
    console.log('• They enter their email (must exist in database)');
    console.log('• They set their password to activate account');
    console.log('• After activation, they can login normally');

  } catch (error) {
    console.error('❌ Error during bootstrap:', error);
    
    if (error.code === 'P2002') {
      console.error('   Unique constraint violation - some data may already exist');
    } else {
      console.error('   Please check your database connection and try again');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Handle script interruption
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Bootstrap interrupted by user.');
  await prisma.$disconnect();
  process.exit(0);
});

seedCEOBootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});