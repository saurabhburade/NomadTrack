#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(MonthYearSheetViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(visible, BOOL)
RCT_EXPORT_VIEW_PROPERTY(monthIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(year, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(foregroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(mutedColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(pillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(accentColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(accentForegroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(borderColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(menuGlassFillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(onClose, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onConfirm, RCTBubblingEventBlock)

@end
