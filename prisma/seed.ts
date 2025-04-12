import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Seed roles
    const roles = await prisma.role.createMany({
        data: [
            { name: 'Admin' },
            { name: 'User' },
        ],
        skipDuplicates: true
    });

    // Fetch roles
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    const userRole = await prisma.role.findFirst({ where: { name: 'User' } });

    if (!adminRole || !userRole) throw new Error('Roles not found');

    // Seed users
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

    // Seed bad words and replacements
    const badWordsMap: any = {
        "goblok": "bodoh",
        "anjing": "kurang ajar",
        "bangsat": "tidak sopan",
        "tolol": "kurang pintar",
        "asu": "nakal",
        "brengsek": "tidak bertanggung jawab",
        "keparat": "jahat",
        "sinting": "tidak waras",
        "idiot": "kurang cerdas",
        "bajingan": "orang jahat",
        "dungu": "kurang cerdas",
        "kampret": "menyebalkan",
        "pecundang": "tidak berani",
        "setan": "pengganggu",
        "iblis": "jahat",
        "gila": "kurang waras",
        "sialan": "menyebalkan",
        "bejat": "tidak bermoral",
        "kacau": "berantakan",
        "payah": "kurang baik",
        "memalukan": "tidak pantas",
        "hancur": "rusak",
        "jahat": "buruk hati",
        "menjengkelkan": "mengganggu",
        "kampungan": "kurang modern"
    };

    const badWordEntries = await prisma.$transaction(
        Object.keys(badWordsMap).map(word =>
            prisma.listBadWords.create({
                data: { word }
            })
        )
    );

    await prisma.$transaction(
        badWordEntries.map(badWord =>
            prisma.listGoodWords.create({
                data: {
                    word: badWordsMap[badWord.word],
                    badWordId: badWord.id
                }
            })
        )
    );

    // Seed tags
    await prisma.tag.createMany({
        data: [
            { tag: 'General' },
            { tag: 'Announcements' }
        ],
        skipDuplicates: true
    });

    // Fetch users and tags
    const alice = await prisma.user.findFirst({ where: { username: 'aliceadmin' } });
    const bob = await prisma.user.findFirst({ where: { username: 'bobuser' } });
    const generalTag = await prisma.tag.findFirst({ where: { tag: 'General' } });
    const announcementTag = await prisma.tag.findFirst({ where: { tag: 'Announcements' } });

    if (!alice || !bob || !generalTag || !announcementTag) throw new Error('Users or Tags not found');

    // Seed posts
    const generalPost = await prisma.post.create({
        data: {
            userId: alice.id,
            content: 'Welcome to the general discussion!',
        }
    });

    await prisma.post.create({
        data: {
            userId: bob.id,
            content: 'New updates coming soon!',
        }
    });

    // Seed replies
    const firstReply = await prisma.reply.create({
        data: {
            userId: bob.id,
            postId: generalPost.id,
            content: 'Thanks for the info!'
        }
    });

    await prisma.reply.create({
        data: {
            userId: alice.id,
            postId: generalPost.id,
            content: 'Glad you found it useful!'
        }
    });

    await prisma.reply.create({
        data: {
            userId: bob.id,
            postId: generalPost.id,
            parentId: firstReply.id,
            content: 'Do you have more details?'
        }
    });

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