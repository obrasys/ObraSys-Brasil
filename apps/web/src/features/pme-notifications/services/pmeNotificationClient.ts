import {
  archivePmeNotificationRepository,
  dismissPmeNotificationRepository,
  generatePmeNotificationsRepository,
  getPmeNotificationPreferences,
  getPmeNotifications,
  getUnreadPmeNotificationsCountRepository,
  markPmeNotificationAsReadRepository,
  markPmeNotificationAsResolvedRepository,
  updatePmeNotificationPreferences
} from "../pmeNotificationRepository";

export const pmeNotificationClient = {
  getNotifications: getPmeNotifications,
  getUnreadCount: getUnreadPmeNotificationsCountRepository,
  markAsRead: markPmeNotificationAsReadRepository,
  markAsResolved: markPmeNotificationAsResolvedRepository,
  archive: archivePmeNotificationRepository,
  dismiss: dismissPmeNotificationRepository,
  getPreferences: getPmeNotificationPreferences,
  updatePreferences: updatePmeNotificationPreferences,
  generate: generatePmeNotificationsRepository
};
