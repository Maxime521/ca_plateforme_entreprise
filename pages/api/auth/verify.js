// pages/api/auth/verify.js
import admin from '../../../lib/firebase-admin';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { uid: decodedToken.uid }
    });

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name || decodedToken.email,
        }
      });
    }

    return res.status(200).json({ 
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
