//pages/api/auth/sync-user.js - Enhanced to handle admin assignment
import admin from '../../../lib/firebase-admin';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { uid, email, displayName, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: 'Missing required fields: uid and email' });
    }

    // Determine user role based on email or manual assignment
    const isAdminEmail = email === 'admin@datacorp.fr' || 
                        email === 'scdr1905@gmail.com' || // Your current email
                        email.endsWith('@datacorp.admin'); // Admin domain

    const userRole = isAdminEmail ? 'admin' : 'user';

    // Upsert user in database with proper role
    const user = await prisma.user.upsert({
      where: { uid },
      update: {
        email,
        displayName: displayName || email.split('@')[0],
        photoURL,
        role: userRole, // Update role on each login
        lastLoginAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL,
        role: userRole, // Set initial role
        lastLoginAt: new Date()
      }
    });

    console.log(`✅ User synced: ${user.email} as ${user.role}`);

    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Sync user error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
}
