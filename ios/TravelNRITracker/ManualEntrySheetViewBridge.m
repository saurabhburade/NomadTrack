#import <React/RCTViewManager.h>
#import "TravelNRITracker-Swift.h"

@interface ManualEntrySheetViewManager : RCTViewManager
@end

@implementation ManualEntrySheetViewManager

RCT_EXPORT_MODULE(ManualEntrySheetView)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIView *)view
{
  return [ManualEntrySheetHostingView new];
}

RCT_EXPORT_VIEW_PROPERTY(visible, BOOL)
RCT_EXPORT_VIEW_PROPERTY(initialDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(countryOptions, NSArray)
RCT_EXPORT_VIEW_PROPERTY(existingRecords, NSArray)

RCT_EXPORT_VIEW_PROPERTY(foregroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(mutedColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(cardColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(chipFillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(inputFillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(inputBorderColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(menuGlassFillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedFillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedBorderColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedForegroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(actionPrimaryForegroundColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(actionSecondaryBorderColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(errorFillColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(errorBorderColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(errorTextColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(placeholderColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(weekdayColorValue, NSString)

RCT_EXPORT_VIEW_PROPERTY(onClose, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onConfirm, RCTBubblingEventBlock)

@end
