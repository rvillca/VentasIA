import React from 'react';
import { UserSecurityModal } from './UserSecurityModal';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: '2fa' | 'inactivity' | 'password';
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'password',
}) => {
  return (
    <UserSecurityModal
      isOpen={isOpen}
      onClose={onClose}
      defaultTab={defaultTab}
    />
  );
};
