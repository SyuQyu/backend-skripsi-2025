// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Seed roles
    await prisma.role.createMany({
        data: [
            { name: 'Admin' },
            { name: 'User' },
        ],
        skipDuplicates: true
    });

    // Fetch created roles
    const roles = await prisma.role.findMany();
    const adminRole = roles.find(role => role.name === 'Admin');
    const userRole = roles.find(role => role.name === 'User');

    // Seed users
    if (adminRole && userRole) {
        await prisma.user.createMany({
            data: [
                {
                    fullName: 'Alice Admin',
                    username: 'aliceadmin',
                    email: 'alice@prisma.io',
                    password: await bcrypt.hash('password456', 10),
                    roleId: adminRole.id
                },
                {
                    fullName: 'Bob User',
                    username: 'bobuser',
                    email: 'bob@prisma.io',
                    password: await bcrypt.hash('password456', 10),
                    roleId: userRole.id
                }
            ],
            skipDuplicates: true
        });
    } else {
        throw new Error('Roles not found');
    }

    // Fetch created users
    const users = await prisma.user.findMany();
    const alice = users.find(user => user.username === 'aliceadmin');
    const bob = users.find(user => user.username === 'bobuser');

    // Seed tags
    await prisma.tag.createMany({
        data: [
            { tag: 'General' },
            { tag: 'Announcements' }
        ],
        skipDuplicates: true
    });

    // Fetch created tags
    const tags = await prisma.tag.findMany();
    const generalTag = tags.find(tag => tag.tag === 'General');
    const announcementTag = tags.find(tag => tag.tag === 'Announcements');

    // Seed posts
    if (generalTag && announcementTag && alice && bob) {
        await prisma.post.createMany({
            data: [
                {
                    userId: alice.id,
                    tagId: generalTag.id,
                    content: 'Welcome to the general discussion!'
                },
                {
                    userId: bob.id,
                    tagId: announcementTag.id,
                    content: 'New updates coming soon!'
                }
            ]
        });
    } else {
        throw new Error('Tags or users not found');
    }

    // Fetch created posts
    const posts = await prisma.post.findMany();
    const generalPost = posts.find(post => post.content === 'Welcome to the general discussion!');

    if (generalPost) {
        // Seed replies
        await prisma.reply.createMany({
            data: [
                {
                    userId: bob.id,
                    postId: generalPost.id,
                    content: 'Thanks for the info!'
                },
                {
                    userId: alice.id,
                    postId: generalPost.id,
                    content: 'Glad you found it useful!'
                }
            ]
        });

        // Fetch created replies
        const replies = await prisma.reply.findMany();
        const firstReply = replies.find(reply => reply.content === 'Thanks for the info!');

        if (firstReply) {
            // Seed nested reply
            await prisma.reply.create({
                data: {
                    userId: bob.id,
                    postId: generalPost.id,
                    parentId: firstReply.id,
                    content: 'Do you have more details?'
                }
            });
        } else {
            throw new Error('First reply not found');
        }
    } else {
        throw new Error('General post not found');
    }

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
