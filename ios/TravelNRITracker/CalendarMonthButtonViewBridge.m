#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(CalendarMonthButtonViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(label, NSString)
RCT_EXPORT_VIEW_PROPERTY(tintColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)

@end
