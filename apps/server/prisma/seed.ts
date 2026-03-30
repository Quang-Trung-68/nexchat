import { PrismaClient, ConversationType, ParticipantRole, MessageType, FriendshipStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10
const DEFAULT_PASSWORD = 'Password123!'

async function main() {
  console.log('[Seed] Starting database seed...')

  // ─── 1. Delete old data in reverse-dependency order ──────────────────────
  console.log('[Seed] Clearing existing data...')
  await prisma.notification.deleteMany()
  await prisma.messageRead.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.message.deleteMany()
  await prisma.conversationParticipant.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.oAuthAccount.deleteMany()
  await prisma.user.deleteMany()

  // ─── 2. Hash password ─────────────────────────────────────────────────────
  console.log('[Seed] Hashing passwords...')
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

  // ─── 3. Create users ──────────────────────────────────────────────────────
  console.log('[Seed] Creating users...')
  const [alice, bob, carol, dave] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Nguyen',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
        bio: 'Frontend developer & coffee lover ☕',
        password: hashedPassword,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        username: 'bob',
        displayName: 'Bob Tran',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        bio: 'Backend engineer, Node.js enthusiast',
        password: hashedPassword,
        isOnline: false,
        lastSeenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      },
    }),
    prisma.user.create({
      data: {
        email: 'carol@example.com',
        username: 'carol',
        displayName: 'Carol Le',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
        bio: 'UI/UX designer',
        password: hashedPassword,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        email: 'dave@example.com',
        username: 'dave',
        displayName: 'Dave Pham',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave',
        bio: 'DevOps & cloud infrastructure',
        password: hashedPassword,
        isOnline: false,
        lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
  ])
  console.log(`[Seed] Created 4 users: ${alice.username}, ${bob.username}, ${carol.username}, ${dave.username}`)

  // ─── 4. Create friendships ────────────────────────────────────────────────
  console.log('[Seed] Creating friendships...')
  const [aliceBobFriendship, aliceCarolFriendship] = await Promise.all([
    // alice ↔ bob: ACCEPTED
    prisma.friendship.create({
      data: {
        requesterId: alice.id,
        addresseeId: bob.id,
        status: FriendshipStatus.ACCEPTED,
      },
    }),
    // alice ↔ carol: ACCEPTED
    prisma.friendship.create({
      data: {
        requesterId: alice.id,
        addresseeId: carol.id,
        status: FriendshipStatus.ACCEPTED,
      },
    }),
    // bob ↔ dave: PENDING (dave hasn't accepted yet)
    prisma.friendship.create({
      data: {
        requesterId: bob.id,
        addresseeId: dave.id,
        status: FriendshipStatus.PENDING,
      },
    }),
  ])
  console.log('[Seed] Created 3 friendships')

  // ─── 5. Create conversations ──────────────────────────────────────────────
  console.log('[Seed] Creating conversations...')
  const [dmConversation, groupConversation] = await Promise.all([
    // DM between alice and bob
    prisma.conversation.create({
      data: {
        type: ConversationType.DM,
        name: null,
        avatarUrl: null,
      },
    }),
    // Group "Dev Team 🚀" with all 4 users
    prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name: 'Dev Team 🚀',
        avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=devteam',
        description: 'Our awesome dev team workspace for collaboration and daily standups',
      },
    }),
  ])
  console.log(`[Seed] Created 2 conversations: DM (${dmConversation.id}), Group (${groupConversation.id})`)

  // ─── 6. Create participants ───────────────────────────────────────────────
  console.log('[Seed] Creating participants...')
  await prisma.conversationParticipant.createMany({
    data: [
      // DM participants
      { conversationId: dmConversation.id, userId: alice.id, role: ParticipantRole.MEMBER },
      { conversationId: dmConversation.id, userId: bob.id, role: ParticipantRole.MEMBER },
      // Group participants: alice is OWNER, rest are MEMBER
      { conversationId: groupConversation.id, userId: alice.id, role: ParticipantRole.OWNER },
      { conversationId: groupConversation.id, userId: bob.id, role: ParticipantRole.MEMBER },
      { conversationId: groupConversation.id, userId: carol.id, role: ParticipantRole.MEMBER },
      { conversationId: groupConversation.id, userId: dave.id, role: ParticipantRole.MEMBER },
    ],
  })
  console.log('[Seed] Created 6 conversation participants')

  // ─── 7. Create messages ───────────────────────────────────────────────────
  console.log('[Seed] Creating messages...')

  // DM messages (6 messages between alice and bob)
  const dmMessages = await Promise.all([
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: alice.id,
        type: MessageType.TEXT,
        content: 'Hey Bob! Have you checked the new Prisma v6 features? 🔥',
        createdAt: new Date(Date.now() - 6 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: bob.id,
        type: MessageType.TEXT,
        content: 'Not yet! What\'s new in there?',
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: alice.id,
        type: MessageType.TEXT,
        content: 'They have omit API and typed SQL now. It\'s going to be a game changer!',
        createdAt: new Date(Date.now() - 4 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: bob.id,
        type: MessageType.TEXT,
        content: 'Wow that sounds awesome! Might be worth upgrading our project.',
        createdAt: new Date(Date.now() - 3 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: alice.id,
        type: MessageType.TEXT,
        content: 'Definitely! I\'ll create a branch and test it out today 🚀',
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: bob.id,
        type: MessageType.TEXT,
        content: 'Perfect. Let me know how it goes. I\'ll review your PR 👌',
        createdAt: new Date(Date.now() - 1 * 60 * 1000),
      },
    }),
  ])
  console.log(`[Seed] Created ${dmMessages.length} DM messages`)

  // Group messages (8 messages + 1 image + 2 reply messages)
  const groupMsg1 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: alice.id,
      type: MessageType.SYSTEM,
      content: 'Alice created the group "Dev Team 🚀"',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  })

  const groupMsg2 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: alice.id,
      type: MessageType.TEXT,
      content: 'Welcome everyone! This is our team chat 🎉 Let\'s get building!',
      createdAt: new Date(Date.now() - 29 * 60 * 1000),
    },
  })

  const groupMsg3 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: bob.id,
      type: MessageType.TEXT,
      content: 'Thanks Alice! Excited to be here. What\'s our sprint goal this week?',
      createdAt: new Date(Date.now() - 27 * 60 * 1000),
    },
  })

  const groupMsg4 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: carol.id,
      type: MessageType.TEXT,
      content: 'I finished the new designs for the dashboard. Let me share the mockups!',
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  })

  // Image message from carol
  const groupMsg5Image = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: carol.id,
      type: MessageType.IMAGE,
      content: null,
      fileUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      fileName: 'dashboard-mockup.png',
      fileSize: 245760,
      createdAt: new Date(Date.now() - 24 * 60 * 1000),
    },
  })

  const groupMsg6 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: alice.id,
      type: MessageType.TEXT,
      content: 'This looks amazing Carol! 😍 Great work!',
      createdAt: new Date(Date.now() - 22 * 60 * 1000),
    },
  })

  // Reply to carol's image message
  const groupMsg7Reply = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: bob.id,
      type: MessageType.TEXT,
      content: 'Love the color scheme! Very clean and modern 🎨',
      parentId: groupMsg5Image.id, // reply to the image message
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    },
  })

  // Reply to bob's reply
  const groupMsg8ReplyToReply = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: carol.id,
      type: MessageType.TEXT,
      content: 'Thank you Bob! I was going for that minimal Zalo-like aesthetic 😊',
      parentId: groupMsg7Reply.id, // reply to bob's reply
      createdAt: new Date(Date.now() - 18 * 60 * 1000),
    },
  })

  const groupMsg9 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: dave.id,
      type: MessageType.TEXT,
      content: 'Just finished setting up the CI/CD pipeline! All green ✅',
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  })

  const groupMsg10 = await prisma.message.create({
    data: {
      conversationId: groupConversation.id,
      senderId: alice.id,
      type: MessageType.TEXT,
      content: 'Awesome work Dave! Let\'s merge the feature branch after our standup 🚀',
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  })

  console.log('[Seed] Created 10 group messages (including 1 image, 2 replies)')

  // ─── 8. Create message reads ──────────────────────────────────────────────
  console.log('[Seed] Creating message reads...')
  await prisma.messageRead.createMany({
    data: [
      // Alice read all DM messages from bob
      { messageId: dmMessages[1].id, userId: alice.id },
      { messageId: dmMessages[3].id, userId: alice.id },
      { messageId: dmMessages[5].id, userId: alice.id },
      // Bob read alice's DM messages
      { messageId: dmMessages[0].id, userId: bob.id },
      { messageId: dmMessages[2].id, userId: bob.id },
      { messageId: dmMessages[4].id, userId: bob.id },
      // Group: everyone read the first few messages
      { messageId: groupMsg1.id, userId: bob.id },
      { messageId: groupMsg1.id, userId: carol.id },
      { messageId: groupMsg1.id, userId: dave.id },
      { messageId: groupMsg2.id, userId: bob.id },
      { messageId: groupMsg2.id, userId: carol.id },
      { messageId: groupMsg2.id, userId: dave.id },
      { messageId: groupMsg3.id, userId: alice.id },
      { messageId: groupMsg3.id, userId: carol.id },
      { messageId: groupMsg4.id, userId: alice.id },
      { messageId: groupMsg4.id, userId: bob.id },
    ],
    skipDuplicates: true,
  })
  console.log('[Seed] Created message reads')

  // ─── 9. Create reactions ──────────────────────────────────────────────────
  console.log('[Seed] Creating reactions...')
  await prisma.reaction.createMany({
    data: [
      { messageId: groupMsg2.id, userId: bob.id, emoji: '🎉' },
      { messageId: groupMsg2.id, userId: carol.id, emoji: '🎉' },
      { messageId: groupMsg2.id, userId: dave.id, emoji: '👍' },
      { messageId: groupMsg5Image.id, userId: alice.id, emoji: '😍' },
      { messageId: groupMsg5Image.id, userId: bob.id, emoji: '🔥' },
      { messageId: groupMsg5Image.id, userId: dave.id, emoji: '👍' },
      { messageId: groupMsg9.id, userId: alice.id, emoji: '🎉' },
      { messageId: groupMsg9.id, userId: carol.id, emoji: '✅' },
    ],
    skipDuplicates: true,
  })
  console.log('[Seed] Created reactions')

  // ─── 10. Create notifications ─────────────────────────────────────────────
  console.log('[Seed] Creating notifications...')
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        type: 'FRIEND_ACCEPTED',
        title: 'Friend request accepted',
        body: 'Bob Tran accepted your friend request',
        isRead: true,
        data: { friendId: bob.id, username: 'bob' },
      },
      {
        userId: alice.id,
        type: 'NEW_MESSAGE',
        title: 'New message from Bob',
        body: 'Bob Tran: Perfect. Let me know how it goes...',
        isRead: false,
        data: { conversationId: dmConversation.id, senderId: bob.id },
      },
      {
        userId: dave.id,
        type: 'FRIEND_REQUEST',
        title: 'New friend request',
        body: 'Bob Tran sent you a friend request',
        isRead: false,
        data: { requesterId: bob.id, username: 'bob' },
      },
    ],
  })
  console.log('[Seed] Created notifications')

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n[Seed] ✅ Database seeded successfully!')
  console.log('[Seed] Summary:')
  console.log('  - 4 users (alice, bob, carol, dave) — password: Password123!')
  console.log('  - 3 friendships (alice↔bob: ACCEPTED, alice↔carol: ACCEPTED, bob↔dave: PENDING)')
  console.log('  - 2 conversations (1 DM alice↔bob, 1 Group "Dev Team 🚀")')
  console.log('  - 16 messages (6 DM + 10 group, including 1 image, 2 replies)')
  console.log('  - 16 message reads, 8 reactions, 3 notifications')
}

main()
  .catch((e) => {
    console.error('[Seed] ❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
