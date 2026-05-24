#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(DashboardToolbarViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(fiscalYearLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(tintColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(menuActionTitles, NSArray)
RCT_EXPORT_VIEW_PROPERTY(menuActionSystemImages, NSArray)
RCT_EXPORT_VIEW_PROPERTY(trailingActionSystemImage, NSString)
RCT_EXPORT_VIEW_PROPERTY(trailingActionAccessibilityLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(onYearPress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMenuAction, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTrailingActionPress, RCTBubblingEventBlock)

@end

@interface RCT_EXTERN_MODULE(NativeGlassButtonViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(systemImage, NSString)
RCT_EXPORT_VIEW_PROPERTY(tintColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(shape, NSString)
RCT_EXPORT_VIEW_PROPERTY(fontSize, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(fontWeight, NSString)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)

@end
