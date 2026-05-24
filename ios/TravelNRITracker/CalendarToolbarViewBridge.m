#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(CalendarToolbarViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(monthLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(foregroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(onManualEntry, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMonthPress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPreviousMonth, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onNextMonth, RCTBubblingEventBlock)

@end
