# Weather Widget Styling Standards

This document outlines the standardized styling patterns that have been applied to all specialized weather widgets in the Kaszuby24 app to ensure consistency and maintainability.

## Container Standards

### Main Container
- **borderRadius**: 16px (consistent across all widgets)
- **padding**: 16px (standardized internal spacing)
- **marginHorizontal**: 8px (consistent 8px side margins as per project requirements)
- **marginVertical**: 8px (consistent vertical spacing)
- **shadowColor**: '#000'
- **shadowOffset**: { width: 0, height: 2 }
- **shadowOpacity**: 0.08 (subtle shadow)
- **shadowRadius**: 8px
- **elevation**: 3 (Android shadow)
- **maxHeight**: 600px (prevents excessive scrolling)

## Header Standards

### Header Container
- **marginBottom**: 20px (increased from 16px for better spacing)
- **flexDirection**: 'row'
- **alignItems**: 'center'

### Icon Container
- **width**: 48px (standardized size)
- **height**: 48px (standardized size)
- **borderRadius**: 24px (circular)
- **marginRight**: 12px (consistent spacing)

### Status Indicator
- **paddingHorizontal**: 12px
- **paddingVertical**: 6px
- **borderRadius**: 20px (pill shape)
- **alignItems**: 'center'
- **justifyContent**: 'center'

### Typography
- **title fontSize**: 18px
- **title fontFamily**: 'Poppins_Bold'
- **subtitle fontSize**: 14px
- **subtitle fontFamily**: 'Poppins_Regular'
- **marginBottom**: 4px (between title and subtitle)
- **statusText fontSize**: 12px
- **statusText fontFamily**: 'Poppins_SemiBold'

## Content Standards

### Content Container
- **gap**: 20px (increased from 16px for better visual separation)
- **ScrollView**: Used for better content management

### Rating Cards
- **padding**: 16px
- **borderRadius**: 12px
- **minHeight**: 100px (increased from 80px)
- **justifyContent**: 'space-between'
- **flexDirection**: 'column'

### Rating Header
- **flexDirection**: 'row'
- **alignItems**: 'center'
- **marginBottom**: 8px
- **gap**: 8px

### Weather Grid
- **gap**: 12px (increased from 8px)
- **flexWrap**: 'wrap'
- **minWidth**: '45%' (ensures proper card sizing)

### Weather Cards
- **padding**: 16px (increased from 12px)
- **borderRadius**: 12px
- **minHeight**: 90px (increased from 80px)
- **justifyContent**: 'center'
- **alignItems**: 'center'
- **shadowColor**: '#000'
- **shadowOffset**: { width: 0, height: 1 }
- **shadowOpacity**: 0.05
- **shadowRadius**: 4px
- **elevation**: 1

### Weather Icon Container
- **width**: 40px
- **height**: 40px
- **borderRadius**: 20px
- **alignItems**: 'center'
- **justifyContent**: 'center'
- **marginBottom**: 8px
- **backgroundColor**: color + '15' (15% opacity for subtle background)

## Typography Standards

### Font Families
- **Bold text**: 'Poppins_Bold'
- **Medium text**: 'Poppins_Medium'
- **SemiBold text**: 'Poppins_SemiBold'
- **Regular text**: 'Poppins_Regular'

### Font Sizes
- **Title**: 18px
- **Subtitle**: 14px
- **Rating values**: 16px
- **Weather values**: 16px
- **Labels**: 11px-12px
- **Body text**: 14px
- **Rating descriptions**: 10px
- **Weather subtexts**: 10px

### Line Heights
- **ratingDescription**: 14px
- **recommendationsText**: 20px
- **tipText**: 20px
- **warningText**: 20px
- **conditionDescription**: 16px
- **recommendationDescription**: 16px

## Spacing Standards

### Gaps
- **Section gaps**: 20px (increased from 16px)
- **Card gaps**: 12px (increased from 8px-12px)
- **Rating container gaps**: 12px
- **Weather grid gaps**: 12px (increased from 8px)
- **Info card gaps**: 12px (increased from 8px)
- **Tip card gaps**: 12px (increased from 8px)

### Margins
- **Header margins**: 20px (increased from 16px)
- **Content margins**: 20px (increased from 16px)
- **Card margins**: 16px (increased from 12px)
- **Rating header margins**: 8px

### Padding
- **Weather cards**: 16px (increased from 12px)
- **Info cards**: 16px (increased from 12px)
- **Tip cards**: 16px (increased from 12px)
- **Warning containers**: 16px (increased from 12px)

## Shadow Standards

### Main Container Shadow
- **shadowOpacity**: 0.08
- **shadowRadius**: 8px
- **elevation**: 3

### Card Shadows
- **shadowOpacity**: 0.05
- **shadowRadius**: 4px
- **elevation**: 1

## Enhanced Features

### Status Indicators
- Dynamic status badges in header showing current conditions
- Color-coded based on weather conditions
- Pill-shaped design for modern appearance

### Icon Containers
- Circular background containers for weather icons
- Subtle color backgrounds (15% opacity)
- Consistent sizing and spacing

### Rating Descriptions
- Added descriptive text below ratings
- Better context for users
- Improved readability

### Enhanced Warnings
- Multiple warning types based on conditions
- Color-coded warning containers
- Contextual icons for each warning type

### ScrollView Implementation
- Better content management for longer widgets
- Smooth scrolling experience
- Prevents layout issues

## Applied Widgets

The following specialized weather widgets have been updated to follow these enhanced standards:

1. **HikerWeatherWidget** ✅ (Enhanced with new features)
2. **FarmerWeatherWidget** ✅ (Enhanced with new features)
3. **CyclistWeatherWidget** ✅ (Enhanced with new features)
4. **DriverWeatherWidget** ✅ (Following standards)
5. **TouristWeatherWidget** ✅ (Following standards)

## Recent Improvements

### UI Enhancements
- Added status indicators in headers
- Enhanced icon containers with background colors
- Improved rating cards with descriptions
- Better spacing and padding throughout
- Added ScrollView for better content management

### New Features
- Wind direction indicators
- Enhanced safety warnings
- Better equipment recommendations
- Improved agricultural insights
- Contextual tips and advice

### Styling Improvements
- Increased gaps for better visual separation
- Enhanced card designs with better shadows
- Improved typography hierarchy
- Better color usage and contrast
- Consistent spacing patterns

## Benefits of Standardization

1. **Consistency**: All widgets now have uniform appearance and behavior
2. **Maintainability**: Easy to update styles across all widgets
3. **User Experience**: Consistent visual hierarchy, spacing, and interactions
4. **Development**: Reduced design decisions and faster development
5. **Accessibility**: Consistent touch targets, spacing, and readability
6. **Modern Design**: Enhanced visual appeal with better spacing and shadows

## Future Updates

When creating new specialized weather widgets, follow these enhanced standards to maintain consistency. Any changes to these standards should be applied to all existing widgets to maintain uniformity.

## Notes

- All measurements use pixels (px) for consistency
- Font families use underscores instead of hyphens (e.g., 'Poppins_Bold' not 'Poppins-Bold')
- Shadow and elevation values are optimized for both iOS and Android
- Spacing follows the 8px grid system used throughout the project
- Enhanced spacing (20px gaps) provides better visual breathing room
- Status indicators add immediate visual feedback about conditions
- Icon containers improve visual hierarchy and icon presentation
