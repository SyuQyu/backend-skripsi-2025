// main.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
    try {
        // Seed users
        // const users = await Promise.all([
        //     prisma.user.create({
        //         data: {
        //             email: 'alice@prisma.io',
        //             full_name: 'Alice',
        //             department: { connect: { department_id: departments[0].department_id } }, // Replace 'department_id_here' with the actual department ID for Superadmin
        //             password: await bcrypt.hash("password456", 10), // Provide a password for the user
        //             role: { connect: { role_id: roles[0].role_id } } // Replace 'admin_role_id_here' with the actual role ID for Admin
        //         }
        //     }),
        //     prisma.user.create({
        //         data: {
        //             email: 'bob@prisma.io',
        //             full_name: 'Bob',
        //             password: await bcrypt.hash("password456", 10), // Provide a password for the user
        //             role: { connect: { role_id: roles[1].role_id }, }, // Replace 'user_role_id_here' with the actual role ID for User
        //             department: { connect: { department_id: departments[1].department_id } }, // Replace 'department_id_here' with the actual department ID for HR
        //             absence_in: "09:00",
        //             absence_out: "17:00",
        //             office: { connect: { office_id: 1 } } // Replace 'office_id_here' with the actual office ID for the user
        //         }
        //     }),
        //     prisma.user.create({
        //         data: {
        //             email: 'rian@prisma.io',
        //             full_name: 'rian',
        //             password: await bcrypt.hash("password456", 10), // Provide a password for the user
        //             role: { connect: { role_id: roles[2].role_id }, }, // Replace 'user_role_id_here' with the actual role ID for User
        //             department: { connect: { department_id: departments[2].department_id } }, // Replace 'department_id_here' with the actual department ID for HR
        //             absence_in: "09:00",
        //             absence_out: "17:00",
        //             office: { connect: { office_id: 1 } } // Replace 'office_id_here' with the actual office ID for the user
        //         }
        //     })
        // ]);

        console.log('Data seeded successfully:');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });