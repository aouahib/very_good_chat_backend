import Context from "../../../../src/shared/context";
import NotificationDataSource
  from "../../../../src/features/notification/data/notification-data-source";
import {anything, instance, mock, verify, when} from "ts-mockito";
import NotificationResolver
  from "../../../../src/features/notification/graphql/resolver";
import {
  Notification,
  NotificationType
} from "../../../../src/features/notification/graphql/types";

const MockNotificationDataSource = mock<NotificationDataSource>();

const userID = 'userIDDDDDDDD';
const context = {
  userID: userID,
  toolBox: {
    dataSources: {
      notificationDS: instance(MockNotificationDataSource)
    }
  }
} as Context;

const resolver = new NotificationResolver();

describe('getNotifications', () => {
  it('should forward the call to notificationDS.getNotification', () => {
    // arrange
    const notification = {type: NotificationType.REQUEST_ACCEPTED} as Notification;
    const promise = new Promise<Notification[]>(r => r([notification]));
    when(MockNotificationDataSource.getNotifications(anything())).thenReturn(promise);
    // act
    const result = resolver.getNotifications(context);
    // assert
    expect(result).toBe(promise);
    verify(MockNotificationDataSource.getNotifications(userID)).once();
  });
});

describe('markNotificationAsSeen', () => {
  it('should forward the call to notificationDS.markNotificationAsSeen', () => {
    // arrange
    const notificationID = 243324;
    const promise = new Promise<boolean>(r => r(true));
    when(MockNotificationDataSource.markNotificationAsSeen(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.markNotificationAsSeen(context, notificationID);
    // assert
    expect(result).toBe(promise);
    verify(MockNotificationDataSource.markNotificationAsSeen(userID, notificationID))
      .once();
  });
});
