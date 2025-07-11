// components/UserProfileManager.js - Standalone User Profile Management
import { useState } from 'react';
import UserProfileModal from './UserProfileModal';

export default function UserProfileManager({ user, children }) {
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleUserClick = () => {
    setProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setProfileModalOpen(false);
  };

  const handleUpdateProfile = (updatedUser) => {
    
    setProfileModalOpen(false);
    // Reload page to reflect changes
    window.location.reload();
  };

  return (
    <>
      {/* Render children with click handler */}
      <div onClick={handleUserClick} style={{ cursor: 'pointer' }}>
        {children}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleUpdateProfile}
      />
    </>
  );
}