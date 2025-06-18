import admin from '../../../lib/firebase-admin';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // For now, let's skip Firebase token verification during development
    // and just sync the user data directly
    const { uid, email, displayName, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ message: 'Missing required fields: uid and email' });
    }

    // Try to verify Firebase token if available
    let verifiedUid = uid;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token && token !== 'undefined') {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        verifiedUid = decodedToken.uid;
        
        // Verify the UID matches the token
        if (decodedToken.uid !== uid) {
          return res.status(403).json({ message: 'Token UID mismatch' });
        }
      } catch (tokenError) {
        console.log('Token verification failed, proceeding with basic sync:', tokenError.message);
        // Continue with basic sync even if token verification fails
      }
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { uid: verifiedUid },
      update: {
        email,
        displayName: displayName || email.split('@')[0],
        photoURL,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        uid: verifiedUid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL,
        lastLoginAt: new Date()
      }
    });

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
