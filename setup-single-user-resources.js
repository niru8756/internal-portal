#!/usr/bin/env node

/**
 * Setup Script: Single User + Unallocated Resources
 * 
 * This script creates:
 * 1. One CEO user (admin privileges)
 * 2. Various resources (Physical, Software, Cloud) 
 * 3. All resources remain unallocated (available for assignment)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupSingleUserWithResources() {
  console.log('🚀 Setting up single user with unallocated resources...\n');

  try {
    // Clear existing data in proper order (respecting foreign key constraints)
    console.log('🧹 Cleaning existing data...');
    await prisma.activityTimeline.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.approvalWorkflow.deleteMany({});
    await prisma.access.deleteMany({});
    await prisma.resourceAssignment.deleteMany({});
    await prisma.resource.deleteMany({});
    await prisma.policy.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.employee.deleteMany({});
    console.log('   ✅ Existing data cleared\n');

    // Create the single CEO user
    console.log('👤 Creating CEO user...');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const ceoUser = await prisma.employee.create({
      data: {
        name: 'Nihil Parmar',
        email: 'nihil@unisouk.com',
        password: hashedPassword,
        role: 'CEO',
        department: 'Executive',
        status: 'ACTIVE',
        joiningDate: new Date(),
        phone: '+91 7905049280',
        address: '123 Business Ave, Corporate City, CC 12345'
      }
    });
    
    console.log(`   ✅ CEO created: ${ceoUser.name} (${ceoUser.email})`);
    console.log(`   🔑 Password: admin123\n`);

    // Create Physical Resources
    console.log('💻 Creating Physical Resources...');
    const physicalResources = [
      {
        name: 'MacBook Pro 16-inch M3',
        category: 'Laptop',
        description: 'High-performance laptop for development work',
        brand: 'Apple',
        modelNumber: 'MBP16-M3-2024',
        serialNumber: 'MBP001',
        totalQuantity: 5,
        value: 2999.99,
        location: 'IT Storage Room A',
        specifications: JSON.stringify({
          processor: 'Apple M3 Pro',
          memory: '32GB',
          storage: '1TB SSD',
          display: '16-inch Liquid Retina XDR'
        })
      },
    ];

    for (const resource of physicalResources) {
      await prisma.resource.create({
        data: {
          ...resource,
          type: 'PHYSICAL',
          owner: 'Unisouk',
          custodianId: ceoUser.id,
          status: 'ACTIVE',
          purchaseDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
          warrantyExpiry: new Date(Date.now() + (2 * 365 * 24 * 60 * 60 * 1000)) // 2 years from now
        }
      });
    }
    console.log(`   ✅ Created ${physicalResources.length} physical resources\n`);

    console.log('🎉 Setup Complete!\n');

    console.log('🔐 Login Credentials:');
    console.log(`   Email: ${ceoUser.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: CEO (Full Access)\n`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupSingleUserWithResources()
  .then(() => {
    console.log('\n✨ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });