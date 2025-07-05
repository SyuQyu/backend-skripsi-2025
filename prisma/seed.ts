import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Seed roles
    await prisma.role.createMany({
        data: [
            { name: 'Admin' },
            { name: 'User' },
            { name: 'SuperAdmin' }
        ],
        skipDuplicates: true
    });

    // Fetch roles
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    const userRole = await prisma.role.findFirst({ where: { name: 'User' } });
    const superAdminRole = await prisma.role.findFirst({ where: { name: 'SuperAdmin' } });

    if (!adminRole || !userRole || !superAdminRole) throw new Error('Roles not found');

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
                fullName: 'Pandu Super Admin',
                username: 'pandusuperadmin',
                email: 'pandu@prisma.io',
                password: await bcrypt.hash('password456', 10),
                roleId: superAdminRole.id
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

    await prisma.commonWord.createMany({
        data: [
            { word: 'kasian' },
            { word: 'sia' },
            { word: 'ti' },
            { word: 'menye' },
            { word: 'item' },
            { word: 'hati' }
        ],
        skipDuplicates: true
    });

    // --- Seed GoodWord & badWord & BadWordGoodWord (Many-to-Many) ---
    // Map kata baik agar tidak duplikat
    const goodWordsArr = [
        "bodoh",
        "kurang ajar",
        "tidak sopan",
        "kurang pintar",
        "nakal",
        "tidak bertanggung jawab",
        "jahat",
        "tidak waras",
        "kurang cerdas",
        "orang jahat",
        "menyebalkan",
        "tidak berani",
        "pengganggu",
        "buruk hati",
        "tidak bermoral",
        "berantakan",
        "kurang baik",
        "tidak pantas",
        "rusak",
        "mengganggu",
        "kurang modern"
    ];

    // Insert GoodWord (kata baik) tanpa duplikat
    await prisma.goodWord.createMany({
        data: goodWordsArr.map(word => ({ word })),
        skipDuplicates: true
    });

    // Ambil semua GoodWord yang sudah ada
    const goodWords = await prisma.goodWord.findMany();
    const goodWordMap = new Map(goodWords.map(gw => [gw.word, gw.id]));

    // Daftar kata kasar dan padanan kata baik
    const badWordsMap: Record<string, string> = {
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

    // Insert badWord (kata kasar)
    await prisma.badWord.createMany({
        data: Object.keys(badWordsMap).map(word => ({ word })),
        skipDuplicates: true
    });

    // Ambil semua badWord yang sudah ada
    const badWords = await prisma.badWord.findMany();
    const badWordMap = new Map(badWords.map(bw => [bw.word, bw.id]));

    // Insert relasi BadWordGoodWord (tanpa duplikat)
    for (const [badWord, goodWord] of Object.entries(badWordsMap)) {
        const badWordId = badWordMap.get(badWord);
        const goodWordId = goodWordMap.get(goodWord);
        if (badWordId && goodWordId) {
            // Cek apakah relasi sudah ada
            const exists = await prisma.badWordGoodWord.findFirst({
                where: { badWordId, goodWordId }
            });
            if (!exists) {
                await prisma.badWordGoodWord.create({
                    data: { badWordId, goodWordId }
                });
            }
        }
    }

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