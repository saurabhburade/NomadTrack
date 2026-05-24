#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(CalendarMonthGridViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(monthDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(dayRecords, NSArray)
RCT_EXPORT_VIEW_PROPERTY(foregroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(weekdayColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(accentColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(onDayPress, RCTBubblingEventBlock)

@end
